var express = require('express'),
  request = require('request'),
  http = require('http'),
  bodyParser = require('body-parser'),
  app = express();

var myLimit = typeof process.argv[2] != 'undefined' ? process.argv[2] : '10mb';
console.log('Using limit: ', myLimit);

/*app.use(bodyParser.json({ limit: myLimit }));
app.use(
  bodyParser.urlencoded({
    limit: myLimit,
    extended: true,
    parameterLimit: 50000,
  })
);*/

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ extend: true, limit: myLimit }));

app.use((err, req, res, next) => {
  // This check makes sure this is a JSON parsing issue, but it might be
  // coming from any middleware, not just body-parser:

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error(err);
    return res.sendStatus(400); // Bad request
  }

  next();
});

var agent = new http.Agent({
  rejectUnauthorized: false,
});

app.all('*', function (req, res, next) {
  // Set CORS headers: allow all origins, methods, and headers: you may want to lock this down in a production environment
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, PATCH, POST, DELETE');
  res.header(
    'Access-Control-Allow-Headers',
    req.header('access-control-request-headers')
  );

  if (req.method === 'OPTIONS') {
    // CORS Preflight
    res.send();
  } else {
    console.log(req.url);
    console.log(req.method);
    console.log(req.body);
    console.log(req.header('Authorization'));
    var targetURL = req.header('Target-URL');
    console.log(targetURL);
    console.log(targetURL + req.url);
    if (!targetURL) {
      res.send(500, {
        error: 'There is no Target-Endpoint header in the request',
      });
      return;
    }
    if (
      req.url == '/certus-user-service/api/login' ||
      req.url == '/certus-user-service/api/create-account' ||
      req.url == '/certus-user-service/api/activate-account' ||
      req.url == '/certus-user-service/api/forgot-password' ||
      req.url == '/certus-user-service/api/user-otp' ||
      req.url == '/certus-user-service/api/resend-otp'
    ) {
      request(
        {
          url: targetURL + req.url,
          method: req.method,
          json: req.body,
          agent,
        },
        function (error, response) {
          if (error) {
            console.error('error: ' + response.statusCode);
          }
        }
      ).pipe(res);
    } else {
      request(
        {
          url: targetURL + req.url,
          method: req.method,
          json: req.body,
          headers: { Authorization: req.header('Authorization') },
          agent,
        },
        function (error, response) {
          if (error) {
            console.error('error: ' + response.statusCode);
          }
        }
      ).pipe(res);
    }
  }
});

app.set('port', process.env.PORT || 7777);
//process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
app.listen(app.get('port'), function () {
  console.log('Proxy server listening on port ' + app.get('port'));
});
