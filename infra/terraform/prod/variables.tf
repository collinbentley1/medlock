variable "allowed_hosts" {
  description = "Hostnames accepted by the MCP endpoint."
  type        = list(string)
  default = [
    "medlock.ai",
    "www.medlock.ai",
    "mcp.medlock.ai",
    "healthmcp.ai",
    "www.healthmcp.ai",
    "healthmcp.app",
    "www.healthmcp.app",
  ]
}

variable "allowed_origins" {
  description = "Browser origins accepted by the MCP and waitlist endpoints."
  type        = list(string)
  default = [
    "https://medlock.ai",
    "https://www.medlock.ai",
    "https://mcp.medlock.ai",
    "https://chat.openai.com",
    "https://claude.ai",
  ]
}

variable "app_version" {
  description = "Version value exposed by /healthz."
  type        = string
  default     = "0.2.0"
}

variable "artifact_registry_repository_id" {
  description = "Artifact Registry Docker repository ID."
  type        = string
  default     = "site"
}

variable "bootstrap_image" {
  description = "Initial public image used before the application container exists."
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
}

variable "canonical_host" {
  description = "Canonical site hostname."
  type        = string
  default     = "medlock.ai"
}

variable "custom_domains" {
  description = "Cloud Run custom domains mapped to the production service."
  type        = list(string)
  default = [
    "medlock.ai",
    "www.medlock.ai",
    "mcp.medlock.ai",
    "healthmcp.ai",
    "www.healthmcp.ai",
    "healthmcp.app",
    "www.healthmcp.app",
  ]
}

variable "legacy_hosts" {
  description = "Hosts redirected by the app to canonical_host."
  type        = list(string)
  default = [
    "healthmcp.ai",
    "www.healthmcp.ai",
    "healthmcp.app",
    "www.healthmcp.app",
  ]
}

variable "preview_deploy_service_account_email" {
  description = "Preview deploy service account email."
  type        = string
  default     = "gha-preview-deploy@medlock-1025243085.iam.gserviceaccount.com"
}

variable "prod_deploy_service_account_email" {
  description = "Production deploy service account email."
  type        = string
  default     = "gha-prod-deploy@medlock-1025243085.iam.gserviceaccount.com"
}

variable "project_id" {
  description = "Google Cloud project ID."
  type        = string
  default     = "medlock-1025243085"
}

variable "region" {
  description = "Primary Google Cloud region."
  type        = string
  default     = "us-east4"
}

variable "runtime_service_account_email" {
  description = "Cloud Run runtime service account email."
  type        = string
  default     = "cloud-run-runtime@medlock-1025243085.iam.gserviceaccount.com"
}

variable "service_name" {
  description = "Production Cloud Run service name."
  type        = string
  default     = "medlock"
}

variable "waitlist_bucket_location" {
  description = "Cloud Storage location for waitlist records."
  type        = string
  default     = "US-EAST4"
}
