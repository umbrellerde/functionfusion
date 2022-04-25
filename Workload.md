## IoT

Sensors: Generate Random Values every X seconds

AnalyzeSensor: Read Sensor Input, save it to DynamoD. Depending on type determine if it is a complicated use case.

CheckSensor: Check if Sensor is still OK. "sieve" parameter at 1000000 takes 1.8s and lots of memory.

MarkSensorBroken: Mark a Sensor as Broken

SoundCheckTolerances: Check if traffic should be rerouted from area

SoundCheckAccident: If a loud noise was heard, check if there is standing traffic behind the loud noise

DetectJam: If air pollution rises, check if there is a jam forming

ActionSignage: Adjust Street Signs (==> Saves to DynamoDB)

ActionTrafficReroute: Send out traffic warnings via different channels (==> Mock API calls)

AirQualityAlarm: Send out an air quality alarm