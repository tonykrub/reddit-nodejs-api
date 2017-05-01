var mysql = require('mysql');
// create a connection to our Cloud9 server
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'tonykrub', 
  password : '',
  database: 'reddit'
});

var bcrypt = require('bcrypt');
var HASH_ROUNDS = 10;

// load our API and pass it the connection
var reddit = require('./reddit');
var redditAPI = reddit(connection);

// Dependencies
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var pug = require('pug');
var morgan = require('morgan');


var app = express();
// Specify the usage of the Pug template engine

app.set('view engine', 'pug');

app.locals.title = "default title";

// Middleware
// This middleware will parse the POST requests coming from an HTML form, and put the result in req.body.  Read the docs for more info!
app.use(bodyParser.urlencoded({extended: false}));   

// // This middleware will parse the Cookie header from all requests, and put the result in req.cookies.  Read the docs for more info!
// app.use(cookieParser());

//var cookieParser = require('cookie-parser');
app.use(cookieParser()); // this middleware will add a `cookies` property to the request, an object of key:value pairs for all the cookies we set


app.use(express.static('public'));   // This is for week5's project. Got this line from https://expressjs.com/en/starter/static-files.html. this 'pubic' folder contains files that we want Chrome to use. We only keep files that we want to share with Chrome in this public folder. This public folder is considered as 'static folder'. Static folder contains files that we want to share with Chrome (because we don't want to share everything in the backend with Chrome. Only certain files in the backend that we want to share with Chrome. For more information about 'static file', read https://expressjs.com/en/starter/static-files.html)

var request = require('request'); // this is for week5's project

/*global $*/      
var cheerio = require('cheerio'); // this is for week5's project

// The middleware
function checkLoginToken(request, response, next) {  
  // check if there's a SESSION cookie...
  if (request.cookies.SESSION) {  // in the browser of the each user, there is a cookie which contains what we call 'SESSION' (session cookie). And this SESSION is a string. On the other hand at the database side, we also store a token for this user. And this token needs to match the cookie from the user. This helps us identify that it is really that user. Remember that in the database there are many tokens for different users that are stored. 
    redditAPI.getUserFromSession(request.cookies.SESSION, function(err, user) {   // because we have 'getUserFromSession' here, we also need to create this 'getUserFromSession' function in reddit.js file.
      // if we get back a user object, set it on the request. From now on, this request looks like it was made by this user as far as the rest of the code is concerned
      if (user) {
        request.loggedInUser = user[0];   // Instead of using only 'user', I use user[0] because here there are many users in the array. (request.loggedInUser does not have only 1 user but can have more than one users.) To access an array, we use []. Mysql always return an array. (this is from the database side)
      }  // if you console.log(request.loggedInUser), you will see that request.loggedInUser has more than one users. That is why we need to do user[0]. Here I console.log('loggedinuser', request.loggedInUser) in the app.post part for 'vote' down below. 
      next();
    });
  }   //  also created a table called 'sessions' in mysql. 'id' in the sessions table is the user id, because the in the sessions table, we keep the token of each user. That is why we need to have user id.
  else {
    // if no SESSION cookie, move forward
    next();
  }
}


// Adding the middleware to our express stack. This should be AFTER the cookieParser middleware
app.use(checkLoginToken);





app.get('/posts', function(req,res){   
    
      redditAPI.getAllPosts(function(err,posts){  // here we only pass callback function. Actually this getAllPosts also needs 'options' as parameter, but according to this function in reddit.js file, if we dont pass 'options', it will use 25. 
  if (err) {
      console.log(err);
  }
  else {
      res.render('post-list', {posts: posts});
  }
    });
});




app.get('/signup', function(request, response) {
  // code to display signup form
    response.render('newuser-signup');
});

//use this one.
app.post('/signup', function(request, response) { // actually we can also pass 'body' as another parameter for the callback function. So if we use function(request, response, body), it will also work. 
  // code to signup a user
  // ihnt: you'll have to use bcrypt to hash the user's password
  console.log(request.body);
    redditAPI.newUserSignUp(request.body.username, request.body.password, function(err, result) {
        if (err) {
            //console.log(err.stack);
            response.status(500).send('something went wrong: ' + err.stack);  
        }
        else {
            response.redirect('/login');  // once new user has signed up, then redirect him/her to login page.
            
        }
    });
    
});


// app.post('/signup', function(request, response) {
//   // code to signup a user
//   // ihnt: you'll have to use bcrypt to hash the user's password
//   console.log(request.body);
//     redditAPI.newUserSignUp(request.body.username, request.body.password, function(err, result) {
//         if (err) {
//             console.log(err.stack);
//             response.status(400).send('sorry ... error!');
//         }
//         else {
//             bcrypt.hash(request.body.password, HASH_ROUNDS, function(err, hashedPassword) {   // this is the same as the createUser function above.
//             if (err) {
//               console.log(err);
//             }
//             else {
//             response.redirect('/login');
//             }
//         });
//     }
//     });
    
// });

// app.post('/signup', function(request, response) {
//   // code to signup a user
//   // ihnt: you'll have to use bcrypt to hash the user's password
//   console.log(request.body);
//     if (!request.body.username || !request.body.password) {
//         response.status(400).send('sorry ... please input your username and password');
//     }
//     else {
//         redditAPI.newUserSignUp(request.body.username, request.body.password, function(err, result) {
//         if (err) {
//             console.log(err.stack);
//         }
//         else {
//             response.redirect('/login');
//         }
//     });
//     }
// });


// app.post('/signup', function(request, response) {
//   // code to signup a user
//   // ihnt: you'll have to use bcrypt to hash the user's password
//     if (!request.body) {
//         response.sendStatus(400);
//     }
//     else 
//     redditAPI.newUserSignUp(request.body.username, request.body.password, function(err, result) {
//         if (err) {
//             console.log(err.stack);
//         }
//         else {
//             response.redirect('/login');
            
//         }
//     })
    
// });



// var urlencodedParser = bodyParser.urlencoded({ extended: false })

// app.post('/signup', urlencodedParser, function(request, response) {
//   //code to signup a user
//   //ihnt: you'll have to use bcrypt to hash the user's password
//     if (!request.body) return response.sendStatus(400);
//     redditAPI.newUserSignUp(request.body.username, request.body.password, function(err, result) {
//         if (err) {
//             console.log(err.stack);
//         }
//         else {
//             response.redirect('/login');
//         }
//     })
    
// });



app.get('/login', function(request, response) {
  // code to display login form
    response.render('login', {title: "Login to Reddit Clone"});
});

// In the request handler:
app.post('/login', function(request, response) { 
    // code to login a user
  // hint: you'll have to use response.cookie here
  redditAPI.checkLogin(request.body.username, request.body.password, function(err, user) {  
    if (err) {
      response.status(401).send(err.message);
    }
    else {
      // password is OK!
      // we have to create a token and send it to the user in his cookies, then add it to our sessions table!
      redditAPI.createSession(user.id, function(err, token) {
        if (err) {
          console.log(err);
          response.status(500).send('an error occurred. please try again later!');
        }
        else {
          response.cookie('SESSION', token); // the secret token is now in the user's cookies!   
          // the above is like res.cookie("key", value); according to http://stackoverflow.com/questions/27978868/destroy-cookie-nodejs 
          response.redirect('/posts');  //  afer logging in, redirect the page to 'posts'.  because seding just the cookie is not enough, also need to redirect the page
          console.log('Hi ' + request.body.username + ', welcome to Reddit! You are logged in!');
        }
      });
    }
  });
});





app.get('/createPost', function(request, response) {
  // code to display 'create post' form
  if (!request.loggedInUser) {   // can also use '!request.body'. will also get the same result
    response.send('Please log in to create a post');
  }
  else {
    redditAPI.getAllSubreddits(function(err, result) {
      if (err) {
        console.log(err.stack);
      }
      else {
        //console.log(result);
        response.render('create-post', {subreddits: result});  // here we are trying to create, on the webpage, a list of subreddits in dropdown list, so that people can select a subreddit to create a post. for more information on creating a dropdown list, check http://www.w3schools.com/TAGS/att_select_form.asp.  we create this on pug 
      }
    });
      
  }
});
// below is the code in create-post.pug
// form(action="/createPost", method="POST", id="subreddits")
//   div
//     input(type="text", name="title", placeholder="Plase enter the post title")
//   div
//     input(type="text", name="url", placeholder="Please enter URL")
//   div
//     select(name='subreddits', form='subreddits')    
//       option(value='Select a subreddit') Select a subreddit   // the thing inside the parenthesis is the value. and whatever words/ statement that come after the parenthesis will be shown on the webpage
//       each subreddit in subreddits   // this is where we loop by using 'each' 
//         option(value=subreddit.id) #{subreddit.name}  // because we want to loop the option. so we put the option here. By using '#{}', subreddit.name will be shown on the webpage
//   button(type="submit") CREATE!

// got the pattern for create-post.pug from http://www.w3schools.com/TAGS/att_select_form.asp, as below. (and then we put the values, etc according to the exercise's instruction)
// <select name="carlist" form="carform">
//   <option value="volvo">Volvo</option>
//   <option value="saab">Saab</option>
//   <option value="opel">Opel</option>
//   <option value="audi">Audi</option>
// </select>
// Then input this into http://html2pug.com/ to convert it to pug. and then make changes to input our own values, variables, etc.



// In the request handler:
app.post('/createPost', function(request, response) {  // here we  can also put 'function(request, response, body)'' instead of just 'function(request, response)'. Either one works ok.
  //check if user is logged in
    //if yes create post
    // if no send message 'log in'
  //req.body has url, name, id
  //subreddit manually
  //your usual callback
  if (!request.loggedInUser) {
    console.log('Please log in to create a post');
  }
  else {
    //console.log(request.body);
    redditAPI.createPost({   // according to reddit.js, we need to pass 'post', 'subredditId' and call back function to the createPost function
      title: request.body.title,
      url: request.body.url,
      userId: request.body.id
    }, request.body.subreddits, function(err, result) {  
      if (err) {
        console.log(err.stack);
      }
      else {
        //console.log(result);
        response.redirect('/posts');
      }
    });
  }
});
  
  



// app.get('/vote', function(request, response) {
//   // code to display vote form
//   if (!request.loggedInUser) {
//     console.log('Please log in to vote');
//   }
//   else {
//     //console.log(request.body);
//     redditAPI.createOrUpdateVote(request.body.vote, function(err, result) {
//       if (err) {
//         console.log(err.stack);
//       }
//       else {
//         response.render('post-vote-list', {posts: result});
//       }
//     })
//   }
// });


app.post('/vote', function(request, response) {
  console.log('body', request.body);  // this is just to check
  console.log('loggedinuser', request.loggedInUser);  // this is just to check what is loggedInUser, and you will see that it is an array of different users, not just one. 
  if (request.loggedInUser) {  
    //console.log();
    redditAPI.createOrUpdateVote(  // for the createOrUpdateVote function, we need to pass 'vote' and callback function as parameters. And according to the createOrUpdateVote function in the reddit.js file, there are 3 things for vote (which are postId, userId, vote, as you will see here)
      {
        postId: request.body.postId, 
        vote: request.body.vote,
        userId: request.loggedInUser.id
      }, function(err, result) {
        if (err) {
          response.send(err.stack);
        }
        else {
          console.log('Thank you very much for your vote!');
          response.redirect('/posts');
          //response.redirect('login');
        }
      });
  }
  else {
    response.status(500).send('Please log in to vote');
    response.redirect('/login');
  }
});
//code to add an up or down vote for a content+user combination
  // if (!request.loggedInUser) {
  //   response.status(400).send('Please log in to vote');
  // }
  // else {
    
  //   redditAPI.createOrUpdateVote(request.body.vote, function(err, result) {
  //     if (err) {
  //       console.log(err.stack);
  //     }
  //     else {
  //       var vote = {
  //         postId: request.body.postId,
  //         userId: request.body.userId,
  //         vote: request.body.vote
  //       };
  //       console.log('Thank you for your vote!');
  //       console.log(vote);
  //       response.redirect('/posts');
  //     }
  //   });
  // }







app.get('/', function(request, response) {
  redditAPI.getAllPosts({}, "hotnessRanking", function(err, result) {  
    if (err) {
      response.status(401).send(err.message);
    }
    else {
      response.render('homepage', {posts: result});
    }
  });
});



app.get('/logout', function(request, response) {
  if (request.loggedInUser) {
    redditAPI.deleteCookie(request.loggedInUser.id, function(err, result) {
      if (err) {
        response.status(401).send(err.message);
      }
      else {
        response.clearCookie('SESSION');
      //console.log('You have been successfully logged out');
        response.redirect('/');
      }
    });
  }
  else {
    response.redirect('/');
  }
});  
  


// all the below functions, downwards on, are for week5's workshop

app.get('/suggestTitle', function(req, res) {  // here we use 'req' instead of 'request' so that it would be the same 'request' as we will make a web request (using the request NPM package) later (as per the workshop's instruction). Same reason as for why we use 'res' here instead of 'response'
 
 // when review this 'suggest title button' exercise, also look at front-end-files.js file which is located under 'public' as well because there is a function there that is related to this 'suggested title button'
  var url = req.query.url;   // got request.query.url from the exercise's instruction
 // var url = 'http://' + req.query.url; // use this instead of the above only when the url input from the user has no 'http://' in the front. However, because normally Chrome will add 'http://', so we don't really need to declare a variable like this, but could do it like the above instead. In the case where the user only input 'www.' without having 'http://' in front of 'www', we also have to add 'http://' in front and declare the variable like this line, otherwise it won't work. However, in general people copy the url from a browser (which will automatically include 'http://'), and paste it in the 'url' field of the 'create post' form. Therefore we don't really need to add 'http://' in the front when we declare the variable like what we did here in this line. 
  console.log('url', req.query);
  console.log('req.query.url: ', req.query.url);
  request(url, function(err, response, body) {  // using the NPM request module, as per the instruction of this exercise. For more info about NPM request, read https://www.npmjs.com/package/request
  // need to add "var request = require('request');" at the top of this file because we use NPM request
   // console.log('response', response);
   // console.log('body', body);
    if (err) {
      response.send('oops, There was an error: ' + err.stack);
     // console.log("Im in the error scope");
    }
    else {
    //  console.log("Im in the success scope")
      $ = cheerio.load(response.body);  // this is similar to what is written in https://www.npmjs.com/package/cheerio. Go through this document and you will find 
      var suggestedTitle = $('title').text();  // read through https://www.npmjs.com/package/cheerio and you will find .text()
      console.log(suggestedTitle);
      res.send({title: suggestedTitle}); 
    }
  });
});



/* YOU DON'T HAVE TO CHANGE ANYTHING BELOW THIS LINE :) */
// Listen
var port = process.env.PORT || 3000;
app.listen(port, function() {
  // This part will only work with Cloud9, and is meant to help you find the URL of your web server :)
  if (process.env.C9_HOSTNAME) {
    console.log('Web server is listening on https://' + process.env.C9_HOSTNAME);
  }
  else {
    console.log('Web server is listening on http://localhost:' + port);
  }
});
