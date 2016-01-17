var fs = require('fs');
var Swagger = require('Swagger-client');
var q = require('q');

function listSwaggerDocs(path) {
    return fs.readdirSync(path);
}

function loadClient(path) {
    var swaggerDoc = JSON.parse(fs.readFileSync(path));
    var client = new Swagger({
        spec: swaggerDoc,
        usePromise: true
    });

    return client
}

function registerParameter(yargs, parameter) {
    // console.log("Registering parameter " + parameter.name);
    return yargs
        .option(parameter.name, {
           demand: true,
           describe: parameter.description,
           type: parameter.modelSignature ? parameter.modelSignature.type : 'string' 
        });                                
}

function registerOperation(yargs, operationmodel, client) {
    // console.log("Registering operation " + operationmodel.nickname);
    yargs.command(operationmodel.nickname, operationmodel.description, function(yargsparam) {
            operationmodel.parameters.forEach(function(parameter) {
                registerParameter(yargsparam, parameter);
            });
            yargsparam.help("h");
            
            var args = yargs.argv;
            var fn = client[operationmodel.nickname];
            fn(args, {responseContentType: 'application/json'})
                .then(function(stuff){
                    console.log('succ', stuff);
                },function(stuff){
                    console.log('err', stuff);
                });
    });
    ;    
}

function registerApi(yargs, apimodel, client) {
    // console.log("Registering API " + apimodel.name);
    yargs.command(apimodel.name, apimodel.description || apimodel.name, function(apiyargsparam) {
        apimodel.operationsArray.forEach(function(operationmodel) {
            registerOperation(apiyargsparam, operationmodel, client[apimodel.name]);
        });
        apiyargsparam.help("h");    
    });
}
    
function registerClient(yargs, client)
{
        client.apisArray.forEach(function(api) {
            registerApi(yargs, api, client);
        });
        
        yargs.help('h');
}

function loadClients()
{
    var clients = listSwaggerDocs('data').map(function(path) {
        return loadClient('data/' + path);
    });
    
    return clients;
}

var yargs = require('yargs');
var clients = loadClients();

q.all(clients).then(function(clients) {
    clients.forEach(function(client) {
        registerClient(yargs, client);
    })
    yargs.argv;
});
