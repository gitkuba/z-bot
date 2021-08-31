const queue = require('./queue')
let terminate = false;
const worker = new Worker();

process.on('SIGTERM',  () => {
    terminate = true;
});

while (!terminate) {
    const message = queue.pop();

    if (message) {
        worker.process(message)
    } else {
        pause(1000);
    }
}


class Worker {

}
