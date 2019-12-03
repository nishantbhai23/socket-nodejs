var http = require("http");
var url = require('url');
var fs = require('fs');
var server = http.createServer();
const api = require('binance');
const binanceWS = new api.BinanceWS(true);
const streams = binanceWS.streams;
server.listen(8000);
// use socket.io
var io = require('socket.io').listen(server);
//turn off debug
io.set('log level', 1);

function filterResults(depthUpdates){
    let newArr = [];
    newArr = depthUpdates.map((eachUpdate) => {
        let total = eachUpdate[0] * eachUpdate[1];
        return {
            'price': eachUpdate[0],
            'quantity': eachUpdate[1],
            'total': total
        };
    });
    newArr = newArr.filter((eachUpdate) => {
        return Number(eachUpdate.quantity)
    })
    return newArr;
}
// define interactions with client
io.sockets.on('connection', function(socket){
    binanceWS.onCombinedStream([
            streams.ticker('BTCUSDT'),
            streams.depthLevel('BTCUSDT', 10),
        ],
        (streamEvent) => {
            switch(streamEvent.stream) {
                case streams.depthLevel('BTCUSDT', 10):
                    console.log('wpa', streamEvent.data);
                    streamEvent.data.bids = filterResults(streamEvent.data.bids);
                    let askResults = filterResults(streamEvent.data.asks);
                    askResults.sort((firstElement,nextElement) => {
                        if(firstElement.price < nextElement.price){
                            return 1;
                        }
                        else if(firstElement.price > nextElement.price){
                            return -1;
                        }
                        else{
                            return 0;
                        }
                    });
                    streamEvent.data.asks = askResults;
                    console.log('Depth event, update order book\n', streamEvent.data);
                    socket.emit('stream', {...streamEvent.data, 'eventType': 'depthLevelUpdate'})
                    break;
                case streams.ticker('BTCUSDT'):
                    socket.emit('stream', {...streamEvent.data, 'streamType': 'ticker'})
                    console.log('Ticker event, update market stats\n', streamEvent.data);
                    break;
            }
        }
    );
});