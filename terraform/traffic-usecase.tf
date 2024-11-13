resource "aws_dynamodb_table" "traffic_sign_table" {
    name = "UseCaseTable"
    billing_mode = "PAY_PER_REQUEST"
    hash_key = "SensorID"

    attribute {
      name = "SensorID"
      type = "N"
    }
}

resource "aws_dynamodb_table" "sensor_data_table" {
    name = "SensorDataTable"
    billing_mode = "PAY_PER_REQUEST"
    hash_key = "SensorID"

    attribute {
      name = "SensorID"
      type = "N"
    }
}