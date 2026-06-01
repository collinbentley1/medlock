# Security Policy

## Reporting

Do not open public issues for security reports. Use GitHub private vulnerability reporting on this repository and include impact, reproduction steps, and any suggested mitigation.

## Current Security Model

- The public MCP deployment serves demo data only.
- Private deployments should set `MEDLOCK_MCP_TOKEN` before connecting real Solid Pod data.
- The MCP endpoint validates allowed hosts and origins.
- Tool results are read-only and avoid server-triggered camera access.
- The waitlist stores contact emails in a private Cloud Storage bucket when `WAITLIST_BUCKET` is configured.
- Error responses do not include stack traces.

## Supported Versions

| Version | Supported |
| --- | --- |
| 0.2.x | Yes |
