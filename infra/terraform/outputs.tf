output "function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.checker.function_name
}

output "function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.checker.arn
}

output "schedule_expression" {
  description = "EventBridge schedule expression"
  value       = var.schedule_expression
}
