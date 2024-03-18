const AWS = require("aws-sdk");

const dynamo = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  let body;
  let statusCode = 200;
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allowed-Methods": "GET, POST, DELETE, PUT, OPTIONS, *",
    "Access-Control-Max-Age": "300",
    "Access-Control-Allow-Credentials": "true",
  };

  try {
    switch (event.httpMethod) {
      case "GET":
        const { Item } = await dynamo
          .get({
            TableName: "guest_rsvp",
            Key: {
              invitation_id: event.queryStringParameters.id,
            },
          })
          .promise();

        if (!Item) {
          throw new Error("INVALID_CODE");
        }

        body = {
          guests: Item.guests.map((item) => {
            const [name, rsvp, vaccinated] = item.split("#");

            return {
              name,
              rsvp: Item.rsvp_flag === undefined ? null : !!Number(rsvp),
              vaccinated:
                Item.rsvp_flag === undefined ? null : !!Number(vaccinated),
            };
          }),
          id: Item.invitation_id,
          dateUpdated: Item.date_updated,
          seatsAllotted: Item.seats_allotted,
          rsvp: Item.rsvp_flag !== undefined ? !!Item.rsvp_flag : undefined,
        };
        break;
      case "POST":
        let { guests, id, rsvp } = JSON.parse(event.body);

        if (!Array.isArray(guests)) {
          throw new Error("INVALID_REQUEST");
        } else if (guests.length <= 0) {
          throw new Error("INVALID_GUESTS");
        } else if (typeof rsvp !== "boolean") {
          throw new Error("INVALID_RSVP");
        }

        const { Attributes } = await dynamo
          .update({
            TableName: "guest_rsvp",
            Key: {
              invitation_id: id,
            },
            ExpressionAttributeValues: {
              ":guests": guests.map((guest) =>
                [guest.name, guest.rsvp ? 1 : 0, guest.vaccinated ? 1 : 0].join(
                  "#"
                )
              ),
              ":rsvp_flag": rsvp ? 1 : 0,
              ":date_updated": Date.now(),
            },
            ConditionExpression:
              "attribute_exists(invitation_id) and attribute_not_exists(rsvp_flag)",
            UpdateExpression:
              "SET guests = :guests, date_updated = :date_updated, rsvp_flag = :rsvp_flag",
            ReturnValues: "ALL_NEW",
          })
          .promise();

        body = {
          guests: Attributes.guests.map((item) => {
            const [name, rsvp, vaccinated] = item.split("#");

            return {
              name,
              rsvp: Attributes.rsvp_flag === undefined ? null : !!Number(rsvp),
              vaccinated:
                Attributes.rsvp_flag === undefined
                  ? null
                  : !!Number(vaccinated),
            };
          }),
          id: Attributes.invitation_id,
          dateUpdated: Attributes.date_updated,
          rsvp: !!Attributes.rsvp_flag,
        };
        break;
      default:
        throw new Error(`Unsupported route: "${event.httpMethod}"`);
    }
  } catch (err) {
    statusCode = 400;
    body = err.message;
  } finally {
    body = JSON.stringify(body);
  }

  return {
    statusCode,
    body,
    headers,
  };
};
