const redis = require("redis");

class Queue {
    client;

    constructor() {
        this.client = redis.createClient();
        this.client.on("error", function(error) {
            console.error(error);
        });
    }

    pop(queueName, message) {
        return JSON.parse(this.client.rpop(queueName))
    }

    push(queueName, message) {
        this.client.rpush(queueName, JSON.stringify(message))
    }
}

export default new Queue();
