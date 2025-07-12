const amqp = require('amqplib');

async function startConsumer() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    const channel = await connection.createChannel();
    await channel.assertQueue('orders', { durable: false });
    console.log('RabbitMQ orderConsumer kuyruğu dinleniyor...');
    channel.consume('orders', (msg) => {
      if (msg !== null) {
        const order = JSON.parse(msg.content.toString());
        console.log('Yeni sipariş mesajı alındı:', order);
        channel.ack(msg);
      }
    });
  } catch (err) {
    console.error('RabbitMQ consumer bağlantı hatası:', err);
  }
}

startConsumer(); 