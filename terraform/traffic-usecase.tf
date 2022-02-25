resource "aws_dynamodb_table" "traffic_sign_table" {
    name = "UseCaseTable"
    billing_mode = "PROVISIONED"
    read_capacity = 10
    write_capacity = 10
    hash_key = "SensorID"

    attribute {
      name = "SensorID"
      type = "N"
    }
}

resource "aws_dynamodb_table" "sensor_data_table" {
    name = "SensorDataTable"
    billing_mode = "PROVISIONED"
    read_capacity = 10
    write_capacity = 10
    hash_key = "SensorID"

    attribute {
      name = "SensorID"
      type = "N"
    }
}