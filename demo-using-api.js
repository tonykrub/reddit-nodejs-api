// load the mysql library
var mysql = require('mysql');

// create a connection to our Cloud9 server
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'tonykrub', 
  password : '',
  database: 'reddit'
});

// load our API and pass it the connection
var reddit = require('./reddit');
var redditAPI = reddit(connection);

//It's request time!  (this is used to create user. once the user was created, we then commented it out)
// redditAPI.createUser({
//   username: 'hello23',
//   password: 'xxx'
// }, function(err, user) {
//   if (err) {
//     console.log(err);
//   }
//   else {
//     redditAPI.createPost({
//       title: 'hi reddit!',
//       url: 'https://www.reddit.com',
//       userId: user.id
//     }, 1, function(err, post) {
//       if (err) {
//         console.log(err);
//       }
//       else {
//         console.log(post);
//       }
//     });
//   }
// });


// below is where you want to add more users because above is just one user.
// for (var i=0; i<10; i++) {

//     redditAPI.createPost({
//       title: 'hi reddit!'+i,
//       url: 'https://www.reddit.com',
//       userId: 1  //or use username to find out userId
//     }, function(err, post) {
//       if (err) {
//         console.log(err);
//       }
//       else {
//         console.log(post);
//       }
//     });
// }

// 1) Improve the getAllPosts function
// At the moment, the getAllPosts function is returning an array of posts. The problem is 
// that it’s hard to figure out the username associated to each post. Since our database 
// schema is somewhat normalized, the posts table only contains a reference to the users 
// table, through the userId column. Your job is to improve this function by returning the 
// user associated with each post. (also look at the instruction for full details)

redditAPI.getAllPosts(function(err,posts){
  if (err) {
    console.log(err);
  }
  else {
    // console.log(posts);
      // var redditPosts = posts.map(function(object) {
      //     return {
      //                   //callback(null, results);
      //         id: object.postId,
      //         title: object.postTitle,
      //         url: object.postUrl,
      //         createdAt: object.postCreatedAt,
      //         updatedAt: object.postUpdatedAt,
      //         userId: object.userId,
      //         user: {
      //             id: object.userId,
      //             username: object.userUsername,
      //             createdAt: object.userCreatedAt,
      //             updatedAt: object.userUpdatedAt
      //         },
      //         subreddit: {
      //           id: object.subredditId,
      //           name: object.subredditName,
      //           description: object.subredditDescription,
        // //      subredditId: object.subredditId,    
        // //      subredditName: object.subredditName,
        // //      subredditDescription: object.subredditDescription
            // }
            // }
        // })
   console.log(posts);  // this will show the result.. just uncomment it to see the result.
    connection.end();
  }
});
  

