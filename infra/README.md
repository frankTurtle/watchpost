# Watchpost AWS Infrastructure

Scheduled checker for Watchpost uptime monitoring, running on AWS Lambda with EventBridge.

## What it does

The Lambda function periodically fetches all active monitors from Supabase, checks each URL
with its configured HTTP method, and records the result (ok/down, status code, latency) back
to the checks table. EventBridge triggers the function on a configurable schedule (default: every 5 minutes).

## Prerequisites

- **AWS account** with credentials configured (via `aws configure` or environment variables)
- **Terraform >= 1.9**
- **Supabase project** with the database schema applied:
  - `public.monitors` (id, name, url, method, interval_minutes, active, created_at)
  - `public.checks` (monitor_id, checked_at, ok, status_code, latency_ms, error)
- Supabase project URL and service role key

## Deployment

1. Copy the example variables file:
   ```bash
   cp infra/terraform/terraform.tfvars.example infra/terraform/terraform.tfvars
   ```

2. Edit `infra/terraform/terraform.tfvars` with your Supabase URL and service role key:
   ```hcl
   aws_region                = "us-east-1"
   supabase_url              = "https://your-project.supabase.co"
   supabase_service_role_key = "your-service-role-key"
   ```

3. Initialize Terraform (from the repo root):
   ```bash
   terraform -chdir=infra/terraform init
   ```

4. Review the planned changes:
   ```bash
   terraform -chdir=infra/terraform plan
   ```

5. Apply the configuration:
   ```bash
   terraform -chdir=infra/terraform apply
   ```

## Cost

The checker runs within AWS Lambda's free tier for most accounts: 128 MB memory, 30-second timeout,
five-minute schedule = ~8,640 invocations/month, well under the 1M free invocations. CloudWatch
Logs also have a free tier. If monitors respond slowly or you run checks frequently, verify your
usage against current AWS pricing.

## Viewing logs

Logs appear in CloudWatch under `/aws/lambda/watchpost-checker`. View them in the AWS console or
via the CLI:

```bash
aws logs tail /aws/lambda/watchpost-checker --follow
```

## Cleanup

To remove all provisioned resources:

```bash
terraform -chdir=infra/terraform destroy
```
