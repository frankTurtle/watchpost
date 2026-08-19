variable "aws_region" {
  description = "AWS region for Lambda and EventBridge resources"
  type        = string
  default     = "us-east-1"
}

variable "supabase_url" {
  description = "Supabase project URL (e.g., https://xxxx.supabase.co)"
  type        = string
}

variable "supabase_service_role_key" {
  description = "Supabase service role key for API access"
  type        = string
  sensitive   = true
}

variable "schedule_expression" {
  description = "EventBridge schedule expression for check frequency (e.g., 'rate(5 minutes)')"
  type        = string
  default     = "rate(5 minutes)"
}

variable "function_name" {
  description = "Name for the Lambda function"
  type        = string
  default     = "watchpost-checker"
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}
