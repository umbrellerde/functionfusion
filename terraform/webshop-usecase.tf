resource "aws_dynamodb_table" "webshop_cart_table" {
    name = "WebshopCartTable"
    billing_mode = "PROVISIONED"
    read_capacity = 10
    write_capacity = 10
    hash_key = "userId"
    range_key = "itemId"

    attribute {
      name = "userId"
      type = "S"
    }
    attribute {
      name = "itemId"
      type = "S"
    }
}

# resource "aws_dynamodb_table" "sensor_data_table" {
#     name = "SensorDataTable"
#     billing_mode = "PROVISIONED"
#     read_capacity = 10
#     write_capacity = 10
#     hash_key = "SensorID"

#     attribute {
#       name = "SensorID"
#       type = "N"
#     }
# }