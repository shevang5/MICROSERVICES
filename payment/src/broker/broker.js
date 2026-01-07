const amqplib = require('amqplib');

let channel, connection;

async function connect() {
    if (connection) return connection;

    try {
        connection = await amqplib.connect(process.env.RABBIT_URL);
        channel = await connection.createChannel();
        console.log('Connected to RabbitMQ');
    } catch (error) {
        console.error('Failed to connect to RabbitMQ:', error);
    }
}

async function publishQueue(publishName, data) {
    if (!channel || !connection) await connect();

    await channel.assertQueue(publishName, {
        durable: true
    });
    channel.sendToQueue(publishName, Buffer.from(JSON.stringify(data)));
    console.log('Message sent to queue:', publishName);
}

async function subscribeToQueue(queueName, callback) {
    if (!channel || !connection) await connect();

    await channel.assertQueue(queueName, {
        durable: true
    });
    channel.consume(queueName, async (message) => {
        if (message !== null) {
            const data = JSON.parse(message.content.toString());
            await callback(data);
            channel.ack(message);
        }
    });
}

module.exports = { connect, channel, connection, publishQueue, subscribeToQueue };