var bcrypt = require('bcrypt');
var HASH_ROUNDS = 10;

// At the top of our reddit.js:
var secureRandom = require('secure-random');  
// this function creates a big random string
function createSessionToken() {
  return secureRandom.randomArray(100).map(code => code.toString(36)).join('');
}


module.exports = function RedditAPI(conn) {
  return {
    // verifyUserPassword: function(user, callback) {   
    //   //1. check if user exists
    //   conn.query('SELECT * FROM users WHERE username = ?', [user.username], function(err, users) {
    //     if (err) {
    //       callback(err);
    //     }
    //     else {
    //       var user = users[0];  //  the result we get will always be an array.. that is why we use users[0]
    //       if (!user) {
    //         callback(new Error('user or password incorrect'))
    //       }
    //       bcrypt.compare(userData.password, user.password, function(err, result) {
    //         if (err) {
    //           callback(err);
    //         }
    //       })
    //     }
    //   })
    // },
    
    
    // createSessionToken: function() {   
    //   return secureRandom.randomArray(100).map(code => code.toString(36)).join('');
    // },
    
    createUser: function(user, callback) {
      
      // first we have to hash the password...
      bcrypt.hash(user.password, HASH_ROUNDS, function(err, hashedPassword) {
        if (err) {
          callback(err);
        }
        else {
          conn.query(
            'INSERT INTO users (username,password, createdAt) VALUES (?, ?, ?)', [user.username, hashedPassword, new Date()],  // here we insert the user into the database
            function(err, result) {
              if (err) {
                /*
                There can be many reasons why a MySQL query could fail. While many of
                them are unknown, there's a particular error about unique usernames
                which we can be more explicit about!
                */
                if (err.code === 'ER_DUP_ENTRY') {
                  callback(new Error('A user with this username already exists'));
                }
                else {
                  callback(err);
                }
              }
              else {
                /*
                Here we are INSERTing data, so the only useful thing we get back
                is the ID of the newly inserted row. Let's use it to find the user
                and return it
                */
                conn.query(
                  'SELECT id, username, createdAt, updatedAt FROM users WHERE id = ?', [result.insertId],
                  function(err, result) {
                    if (err) {
                      callback(err);
                    }
                    else {
                      /*
                      Finally! Here's what we did so far:
                      1. Hash the user's password
                      2. Insert the user in the DB
                      3a. If the insert fails, report the error to the caller
                      3b. If the insert succeeds, re-fetch the user from the DB
                      4. If the re-fetch succeeds, return the object to the caller
                      */
                        callback(null, result[0]);
                    }
                  }
                );
              }
            }
          );
        }
      });
    },

    createPost: function(post, subredditId, callback) {
      conn.query(
        'INSERT INTO posts (userId, title, url, createdAt, subredditId) VALUES (?, ?, ?, ?, ?)', [post.userId, post.title, post.url, new Date(), subredditId],
        function(err, result) {
          if (err) {
            callback(err);
          }
          else {
            /*
            Post inserted successfully. Let's use the result.insertId to retrieve
            the post and send it to the caller!
            */
            conn.query(
              'SELECT id, title, url, userId, createdAt, updatedAt, subredditId FROM posts WHERE id = ?', [result.insertId],
              function(err, result) {
                if (err) {
                  callback(err);
                }
                else {
                  callback(null, result[0]);
                }
              }
            );
          }
        }
      );
    },
    
    getAllPosts: function(options, sortingMethod, callback) {
      // In case we are called without an options parameter, shift all the parameters manually
      if (!callback) {
        callback = options;
        options = {};
      }
      var limit = options.numPerPage || 25; // if options.numPerPage is "falsy" then use 25
      var offset = (options.page || 0) * limit;
      
      var sortingMethod;
            if (sortingMethod === "voteScore") {
        sortingMethod = 'voteScore';    
      }
      if (sortingMethod === 'hotnessRanking' ) {
        sortingMethod = 'hotnessRanking';
      }
      if (sortingMethod === "newestRanking") {
        sortingMethod = 'newestRanking';
      }
      if (sortingMethod === "controversialRanking") {
        sortingMethod = 'controversialRanking';
      }
      // in the below inside conn.query, you will see SUM(v.vote). read more about SUM at http://dev.mysql.com/doc/refman/5.7/en/group-by-functions.html#function_sum
      // in the below inside conn.query, you will see SUM(IF(vote = 1, 1, 0)). read more about IF at http://dev.mysql.com/doc/refman/5.7/en/control-flow-functions.html#function_if 
      // According to http://dev.mysql.com/doc/refman/5.7/en/group-by-functions.html#function_sum, we get "IF(expr1,expr2,expr3)". This means If expr1 is TRUE, then IF() returns expr2; otherwise it returns expr3. In our case we have IF(vote = 1, 1, 0) which is for upvote. This means if vote = 1(upvote), return or count 1. If not, return 0 or donot count. 
      conn.query(`
        SELECT p.id AS postId, p.title AS postTitle, p.url AS postUrl, p.userId AS postUserId, p.createdAt AS newestRanking, p.updatedAt AS postUpdatedAt,
              u.id AS userId, u.username AS userUsername, u.createdAt AS userCreatedAt, u.updatedAt AS userUpdatedAt,
              s.id AS subredditId, s.name AS subredditName, s.description AS subredditDescription,
              v.postId AS votePostId, v.userId AS voteUserId, v.vote AS vote, v.createdAt AS voteCreatedAt, v.updatedAt As voteUpdatedAt,
              SUM(v.vote) AS voteScore,
              SUM(IF(vote = 1, 1, 0)) AS numUpVotes,  
              SUM(IF(vote = -1, 1, 0)) AS numDownVotes,
              SUM(v.vote)/(NOW() - p.createdAt) AS hotnessRanking,
              CASE 
                WHEN SUM(IF(vote = 1, 1, 0)) < SUM(IF(vote = -1, 1, 0)) 
                  THEN SUM(v.vote) * (SUM(IF(vote = 1, 1, 0)) / SUM(IF(vote = -1, 1, 0)))
                  ELSE SUM(v.vote) * (SUM(IF(vote = -1, 1, 0)) / SUM(IF(vote = 1, 1, 0)))
              End AS controversialRanking
        FROM posts AS p
        JOIN users AS u
        ON p.userId = u.id
        LEFT JOIN subreddits As s
        ON p.subredditId = s.id
        LEFT JOIN votes AS v
        ON p.id = v.postId
        GROUP BY p.id
        ORDER BY hotnessRanking DESC
        LIMIT ? OFFSET ?`
        , [limit, offset],
        function(err, results) {
          if (err) {
            callback(err);
          }
          else {
            //callback(null, results);
            var redditPosts = results.map(function(object) {
          return {
                        //callback(null, results);
              id: object.postId,
              title: object.postTitle,
              url: object.postUrl,
              createdAt: object.newestRanking,
              updatedAt: object.postUpdatedAt,
              userId: object.userId,
              user: {
                  id: object.userId,
                  username: object.userUsername,
                  createdAt: object.userCreatedAt,
                  updatedAt: object.userUpdatedAt
              },
              subreddit: {
                id: object.subredditId,
                name: object.subredditName,
                description: object.subredditDescription,
              },
              vote: {
                voteUserId: object.voteUserId,
                //vote: object.vote,
                //voteCreatedAt: object.voteCreatedAt,
                voteScore: object.voteScore,
                totalUpVote: object.numUpVotes,
                totalDownVote: object.numDownVotes,
                //topRanking: object.voteScore,
                //newestRanking: object.newestRanking,
                hotnessRanking: object.hotnessRanking,
                controversialRanking: object.controversialRanking
              }
          };
          });
   //       console.log(redditPosts);
          callback(null, redditPosts);
        }
        }
      );
    },
    
    getAllPostsForUser: function(userId, options, callback) { 
      if (!callback) {
        callback = options;
        options = {}; // this means if i dont recieve options object, i will create an empty object. 
      }
      var limit = options.numPerPage || 25; // if options.numPerPage is "falsy" then use 25
      var offset = (options.page || 0) * limit;
      
      conn.query(`
        SELECT p.id AS id, p.title AS title, p.url AS url, p.createdAt AS createdAt, p.updatedAt AS updatedAt, p.userId AS userId,
              u.id AS userId, u.username AS username, u.createdAt AS userCreatedAt, u.updatedAt AS userUpdatedAt
        FROM posts AS p
        JOIN users AS u
        ON p.userId = u.id
        WHERE userId = ?  
        ORDER BY p.createdAt DESC
        LIMIT ? OFFSET ?`
        // in the above we put the question mark (?) for userId. The question mark (?) is like a placeholder because we dont know the value of userId yet. So we give it a place holder and we use the question mark as placeholder. 
        , [userId, limit, offset], // these are the placeholders. We put all the placeholder here. 
        function(err, results) {
          if (err) {
            callback(err);
          }
          else {
        //   callback(null, results);
            var mappedGetAllPostsForUser = results.map(function(post) {
          return {
              id: post.id,
              title: post.title,
              url: post.url,
              createdAt: post.createdAt,
              updatedAt: post.updatedAt,
              userId: post.userId,
              user: {
                  id: post.userId,
                  username: post.username,
                  createdAt: post.userCreatedAt,
                  updatedAt: post.userUpdatedAt
              }
            };
        });
            callback(null, mappedGetAllPostsForUser);
          }
        });
    },
    
    getSinglePost: function(postId, callback) { // this part is done!
   
      conn.query(`
        SELECT p.id AS postId, p.title AS postTitle, p.url AS url, p.userId AS userId, p.createdAt AS postCreatedAt, p.updatedAt AS postUpdatedAt,
              u.id AS userId, u.username AS Username, u.createdAt AS userCreatedAt, u.updatedAt AS userUpdatedAt
        FROM posts AS p
        JOIN users AS u
        ON p.userId = u.id
        WHERE p.Id = ?`
        // in the above we put the question mark (?) for p.Id. The question mark (?) is like a placeholder because we dont know the value of userId yet. So we give it a place holder and we use the question mark as placeholder. 
        , [postId], // these is the placeholder. We put all the placeholders here if there is more than one. 
        function(err, results) {
          if (err) {
            callback(err);
          }
          else {
            var mappedGetSinglePost = results.map(function(post) {
          return {
              id: post.postId,
              title: post.postTitle,
              url: post.url,
              createdAt: post.postCreatedAt,
              updatedAt: post.postUpdatedAt,
              userId: post.userId,
              user: {
                  id: post.userId,
                  username: post.Username,
                  createdAt: post.userCreatedAt,
                  updatedAt: post.userUpdatedAt
              }
            };
        });
            callback(null, mappedGetSinglePost);
        // callback(null, results);
          }
        });
    },
    
    createSubreddit: function(sub, callback){ 
      conn.query(
        'INSERT INTO subreddits (name, description, createdAt, updatedAt) VALUES (?, ?, ?, ?)', [sub.name, sub.description || '', new Date(), new Date()],
        function(err, result) {
          if (err) {
            callback(err);
          }
          else {
            /*
            subreddit inserted successfully. Let's use the result.insertId to retrieve
            the post and send it to the caller!
            */
            conn.query(
              'SELECT id, name, description, userId, createdAt, updatedAt FROM subreddits WHERE id = ?', [result.insertId],
              function(err, result) {
                if (err) {
                  callback(err);
                }
                else {
                  callback(null, result[0]);
                }
              }
            );
          }
        }
      );
    },
    
    getAllSubreddits: function(callback) { 
      conn.query(`
        SELECT id, name, description, createdAt, updatedAt
        FROM subreddits
        ORDER BY createdAt DESC`, 
        function(err, results) {
          if (err) {
            callback(err);
          }
          else {
            callback(null, results);
          }
        }
      );
    },
    
    createOrUpdateVote: function(vote, callback) {
      console.log('VOTE HERE', vote);
    if (vote.vote != 1 && vote.vote != 0 && vote.vote!= -1) {  // it is vote.vote because it is indicated in the instruction of this part that "This function will take a vote object with 'postId', 'userId', 'vote'.". So 'vote' is an object, that is why we use dot.
      console.log('this is not a valid vote.');
    }
    else {
      conn.query(`
      INSERT INTO votes (postId, userId, vote) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE vote = ?`,[vote.postId, vote.userId, vote.vote, vote.vote],  // this "INSERT ..." is mentioned in the exercise instruction but we use INSERT because the data will be inserted into the votes table.   And we have vote.vote twice in the square bracket because the first vote.vote is the first vote. but if the person changes his vote, it will be updated and will become a new vote. This is mentioned in the exercise instruction 
      function(err, results) {
        if (err) {
          callback(err);
        }
        else {
          callback(null, results);
        }
      });
      }
    },
    
    newUserSignUp: function(username, password, callback) {   // actually it is also ok to use the createUser function instead of having to create this newUserSignUp function. this newUserSignUp function is for new user to sign up. Therefore, it should take username, password and a callback function as parameters.  This function is created for week 4's workshop
      conn.query(`     
      SELECT * FROM users
      WHERE username = ?`,
      [username], function(err, result) {    
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {  // this is the same as the createUser function above. 
            callback(new Error('A user with this username already exists'));
          }
          else {
            callback(err);
          }
        }
        else {
          bcrypt.hash(password, HASH_ROUNDS, function(err, hashedPassword) {   // this is the same as the createUser function above.  we need to hash password first, so that we can later insert the hash password into the database
            if (err) {
              callback(err);
            }
            else {
          conn.query(`
          INSERT INTO users (username, password, createdAt)
          VALUES (?, ?, ?)`,
          [username, hashedPassword, new Date()], function(err, result) {   // here we have to use 'hashedPassword' because we dont want to store the real password but we want to store the hashed password.
            if (err) {
              callback(err);
            }
            else {
              callback(null, result[0]);   // // this is the same as the createUser function above.
              console.log('Thank you very much for signing up! Welcome to Reddit!');
            }
          });
          }
          });
        }
      });
    },
    
    checkLogin: function(user, password, callback) {  
      conn.query('SELECT * FROM users WHERE username = ?', 
      [user], function(err, result) {
    // check for errors, then...
        if (result.length === 0) {
          callback(new Error('username or password incorrect'));// in this case the user does not exists
        }
        else {
          var user = result[0];
          var actualHashedPassword = user.password;
          bcrypt.compare(password, actualHashedPassword, function(err, result) {
            if(result === true) {// let's be extra safe here
              callback(null, user);
            }
            else {
              callback(new Error('username or password incorrect')); // in this case the password is wrong, but we reply with the same error
            }
          });
        }
      });
    },
    
    createSession: function(userId, callback) {
      var token = createSessionToken();
      conn.query('INSERT INTO sessions SET id = ?, token = ?, createdAt = ?', 
      [userId, token, new Date()], function(err, result) {
        if (err) {
          callback(err);
        }
        else {
          callback(null, token); // this is the secret session token :)  // if there is no 'null', we are sending an error as token
          }
      });
    },
    
    getUserFromSession: function(token, callback) {
      conn.query(`
        SELECT * FROM sessions 
        WHERE token = ?`,
        [token], function(err, user) {  // here 'user' is 'result'. so we can also use 'function(err, result)' instead of 'function(err, user)'. But it is better to use 'user' instead of 'result' to make it more realistic
          if (err) {
            console.log(err.stack);
            callback(err);
          }
          else {
            callback(null, user);
          }
        });
    },
    
    deleteCookie: function(userId, callback) {
      conn.query(`
        DELETE FROM sessions 
        WHERE id = ?`,
        [userId], function(err, result ) {  
          if (err) {
            console.log(err.stack);
            callback(err);
          }
          else {
            callback(null, result);
          }
        });
    },
  
  };
};



