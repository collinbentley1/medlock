data "google_project" "current" {
  project_id = var.project_id
}

locals {
  labels = {
    app        = "medlock"
    managed-by = "terraform"
  }

  custom_domains = toset(var.custom_domains)
}

resource "google_artifact_registry_repository" "site" {
  #checkov:skip=CKV_GCP_84:Google-managed encryption is sufficient for public open-source container images.
  project       = var.project_id
  location      = var.region
  repository_id = var.artifact_registry_repository_id
  description   = "Container images for Medlock."
  format        = "DOCKER"

  docker_config {
    immutable_tags = true
  }

  cleanup_policy_dry_run = false

  cleanup_policies {
    id     = "delete-pr-images-after-30-days"
    action = "DELETE"

    condition {
      older_than   = "2592000s"
      tag_prefixes = ["pr-"]
      tag_state    = "TAGGED"
    }
  }

  cleanup_policies {
    id     = "keep-recent-images"
    action = "KEEP"

    most_recent_versions {
      keep_count = 30
    }
  }

  labels = local.labels
}

resource "google_artifact_registry_repository_iam_member" "prod_deploy_writer" {
  project    = var.project_id
  location   = google_artifact_registry_repository.site.location
  repository = google_artifact_registry_repository.site.repository_id
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${var.prod_deploy_service_account_email}"
}

resource "google_artifact_registry_repository_iam_member" "preview_deploy_writer" {
  project    = var.project_id
  location   = google_artifact_registry_repository.site.location
  repository = google_artifact_registry_repository.site.repository_id
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${var.preview_deploy_service_account_email}"
}

resource "google_artifact_registry_repository_iam_member" "runtime_reader" {
  project    = var.project_id
  location   = google_artifact_registry_repository.site.location
  repository = google_artifact_registry_repository.site.repository_id
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${var.runtime_service_account_email}"
}

resource "google_storage_bucket" "waitlist" {
  #checkov:skip=CKV_GCP_62:Waitlist entries are low-volume user-submitted contact records; Cloud Audit Logs cover administrative access.
  name                        = "${var.project_id}-waitlist-${data.google_project.current.number}"
  project                     = var.project_id
  location                    = var.waitlist_bucket_location
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false

  versioning {
    enabled = true
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }

    condition {
      age                   = 365
      matches_storage_class = ["STANDARD"]
    }
  }

  labels = merge(local.labels, {
    purpose = "waitlist"
  })
}

resource "google_storage_bucket_iam_member" "runtime_waitlist_object_admin" {
  bucket = google_storage_bucket.waitlist.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${var.runtime_service_account_email}"
}

resource "google_cloud_run_v2_service" "site" {
  project              = var.project_id
  name                 = var.service_name
  location             = var.region
  client               = "terraform"
  deletion_protection  = true
  ingress              = "INGRESS_TRAFFIC_ALL"
  invoker_iam_disabled = true
  labels               = local.labels

  template {
    service_account                  = var.runtime_service_account_email
    timeout                          = "300s"
    max_instance_request_concurrency = 80

    scaling {
      max_instance_count = 10
      min_instance_count = 0
    }

    containers {
      name  = "site"
      image = var.bootstrap_image

      ports {
        container_port = 8080
        name           = "http1"
      }

      env {
        name  = "ALLOWED_HOSTS"
        value = join(",", var.allowed_hosts)
      }

      env {
        name  = "ALLOWED_ORIGINS"
        value = join(",", var.allowed_origins)
      }

      env {
        name  = "CANONICAL_HOST"
        value = var.canonical_host
      }

      env {
        name  = "LEGACY_HOSTS"
        value = join(",", var.legacy_hosts)
      }

      env {
        name  = "MEDLOCK_VERSION"
        value = var.app_version
      }

      env {
        name  = "WAITLIST_BUCKET"
        value = google_storage_bucket.waitlist.name
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }

        cpu_idle          = true
        startup_cpu_boost = true
      }
    }
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }

  lifecycle {
    ignore_changes = [
      client,
      client_version,
      template[0].containers[0].image,
    ]
  }

  depends_on = [
    google_artifact_registry_repository.site,
    google_artifact_registry_repository_iam_member.runtime_reader,
    google_storage_bucket_iam_member.runtime_waitlist_object_admin,
  ]
}

resource "google_cloud_run_domain_mapping" "site" {
  for_each = local.custom_domains
  provider = google.no_attribution

  project  = var.project_id
  location = var.region
  name     = each.value

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.site.name
  }

  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      metadata[0].annotations,
      metadata[0].labels,
      spec[0].certificate_mode,
      spec[0].force_override,
    ]
  }
}
