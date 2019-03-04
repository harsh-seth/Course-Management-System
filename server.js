const express = require('express')
const joi = require('joi')
const app = express()

app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(express.static('./public'))

app.set('views', './views')
app.set('view engine', 'pug')

const portNum = 3000

var user_details = {
    'alice': {
        'name': 'Alice',
        'password': '1234',
        'isAdmin': false
    },
    'bob': {
        'name': 'Bob',
        'password': '1234',
        'isAdmin': false
    },
    'clara': {
        'name': 'Clara',
        'password': '1234',
        'isAdmin': false
    },
    'drew': {
        'name': 'Drew',
        'password': '1234',
        'isAdmin': false
    },
    'eliot': {
        'name': 'Eliot',
        'password': '1234',
        'isAdmin': false
    },
    'felicity': {
        'name': 'Felicity',
        'password': '1234',
        'isAdmin': false
    },
    'admin': {
        'name': 'Admin',
        'password': '1234',
        'isAdmin': true
    }
}

var course_details = {
    'CSE1001': {
        'desc': "Course 1",
        'startDate': new Date("2019-02-05")
    },
    'CSE1002': {
        'desc': "Course 2",
        'startDate': new Date("2019-02-04")
    },
    'CSE1003': {
        'desc': "Course 3",
        'startDate': new Date("2019-04-05")
    },
    'CSE1004': {
        'desc': "Course 4",
        'startDate': new Date("2019-02-05")
    },
    'CSE1005': {
        'desc': "Course 5",
        'startDate': new Date("2019-04-05")
    },
}

var registrations = {
    'CSE1001': ['alice', 'bob', 'clara', 'drew', 'eliot'],
    'CSE1002': ['alice', 'bob', 'clara', 'drew'],
    'CSE1003': ['alice', 'bob'],
    'CSE1004': ['felicity']
}

var sessions = {}

const cli_authenticator = joi.boolean().allow(null).default(false)
const auth_token_authenticator = joi.string().length(26).required()
const courseCode_authenticator = joi.string().regex(/^[A-Z]{3}[0-9]{4}$/).required()

const validators = {
    'cli': {
        'cli': cli_authenticator
    },
    'authorized': {
        'cli': cli_authenticator,
        'auth_token': auth_token_authenticator
    },
    'login': {
        'cli': cli_authenticator,
        'username': joi.string().required(),
        'password': joi.string().required()
    },
    'signup': {
        'cli': cli_authenticator,
        'username': joi.string().required(),
        'password': joi.string().required().length(4),
        'name': joi.string().required(),
        'isAdmin': joi.boolean().required()
    },
    'addCourse': {
        'cli': cli_authenticator,
        'auth_token': auth_token_authenticator,
        'courseCode': courseCode_authenticator,
        'courseDesc': joi.string().required(),
        'courseStartDate': joi.date().required()
    },
    'courseOps': {
        'cli': cli_authenticator,
        'auth_token': auth_token_authenticator,
        'courseCode': courseCode_authenticator,
    },
    'courseDetails': {
        'cli': cli_authenticator,
        'auth_token': auth_token_authenticator,
        'courseCode': courseCode_authenticator
    }
}

const messages = {
    'invalidParams': "Invalid Parameters.",
    'invalidParamsGUI': "Something went wrong!",
    'userDNE': "No such user exists in database!",
    'wrongPW': "Invalid user-password combination",
    "usernameDup": "That username is taken!",
    'loginOK': "Logged in!",
    'signupOK': "Signed up!",
    'logoutOK': "Logged out!",
    'courseDup': "A course with that code exists!",
    'courseDNE': "No course with that code exists!",
    'courseStarted': "The last date for changes in registration has passed!",
    'courseAddOK': "Course added successfully!",
    'courseDelOK': "Course deleted successfully!",
    'courseRegOK': "Successfully registered to course!",
    'courseDeregOK': "Successfully deregistered from course!",
    'authMissing': "You have to log in to access that!",
    'authMissingCLI': "You have to log in to access that! Provide auth_token",
    'authError': "Invalid token!",
    'privError': "Insufficient privileges!",
    'invalidURL': "The requested URL does not exist",
    'genError': "Whoops, something went wrong! Login again"
}

const listOfCLIEndPoints = [
    '/',
    '/home',
    '/signup',
    '/login',
    '/logout',
    '/list',
    '/listRegistered',
    '/course',
    '/add',
    '/delete',
    '/register',
    '/deregister'
]

function generateAuthToken() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// function to add all variables required for render of home
function prepareHomeRenderDetails(current_user) {
    var details =  {
        'name' : user_details[current_user]['name'],
        'isAdmin' : user_details[current_user]['isAdmin']
    }

    // a list of all courses
    var courseList = []
    for (var courseCode in course_details) {
        courseList.push({
            'courseCode': courseCode,
            'courseDesc': course_details[courseCode]['desc']
        })
    }
    details['courseList'] = courseList
    
    if (!details['isAdmin']) {
        // a list of all registered courses
        var registeredCourses = []
        for (var courseCode in registrations) {
            if (registrations[courseCode].indexOf(current_user) != -1) {
                registeredCourses.push({
                    'courseCode': courseCode,
                    'courseDesc': course_details[courseCode]['desc'],
                    'active': (registrations[courseCode].length > 5)
                })
            }
        } 
        details['registeredCourseList'] = registeredCourses
    }
    return details
}

// Authenticated access middleware
app.use((req, res, next) => {
    // validate body contents
    var auth_validator = joi.object(validators['authorized']).unknown() 
    const result = auth_validator.validate(req.body)

    // if validation fails (token was not provided)
    if (result.error) {
        // if CLI, display list of allowed endpoints for '/' and '/home'
        if (result.value.cli) {
            if(req.url === '/' || req.url === '/home') {
                return res.send({'message': listOfCLIEndPoints})
            }
        }
        
        // if seeking authentication, then allow access without token
        if (req.url === '/' || req.url === '/signup' || req.url === '/login') {
            return next()
        }
        
        if(result.value.cli) {
            return res.send({'message': messages['authMissingCLI']})
        } else {
            // send to front page
            return res.redirect('/')
        }
    } else {
        // check if session with that token doesn't exist
        if (!(result.value.auth_token in sessions)) {
            if(result.value.cli) {
                return res.status(400).send({'message': messages['authError']})
            } else {
                // send to front page with message
                return res.status(400).render('landing', {'message': messages['genError']})
            }
        } else {
            // everyhing checks out!

            // if CLI, display list of allowed endpoints for '/' and '/home'
            if(req.url === '/' || req.url === '/home') {
                if (result.value.cli) {
                    return res.send({'message': listOfCLIEndPoints})
                } else {
                    var current_user = sessions[result.value.auth_token]
                    var responseDetails = prepareHomeRenderDetails(current_user)
                    responseDetails['auth_token'] = result.value.auth_token
                    return res.render('home', responseDetails)
                }
            }

            // allow access
            return next()
        }
    }
})

app.post('/login', (req, res) => {
    // validate body contents
    const result = joi.validate(req.body, validators['login'])
    
    // check if validation fails 
    if (result.error) {
        if (result.value.cli) {
            res.status(400).send({'message': result.error.details[0].message})
        } else {
            res.status(400).render('landing', {'message': result.error.details[0].message})
        }
    } else {
        // check if username does not exists in DB
        if (!(result.value.username in user_details)) {
            if(result.value.cli) {
                res.status(400).send({'message': messages['userDNE']})
            } else {
                res.status(400).render('landing', {'message': messages['userDNE']})
            }
        } else {
            // check if password does not match
            if (result.value.password !== user_details[result.value.username]['password']) {
                if (result.value.cli) {
                    res.status(400).send({'message': messages['wrongPW']})
                } else {
                    res.status(400).render('landing', {'message': messages['wrongPW']})
                }
            } else {
                // everything checks out!
                
                // create 'session'
                var auth_token = generateAuthToken()
                sessions[auth_token] = result.value.username

                if (result.value.cli) {
                    var responseDetails = {
                        'auth_token': auth_token,
                        'message': messages['loginOK']
                    }
                    res.send(responseDetails)
                } else {
                    // add details for rendering the next page
                    var responseDetails = prepareHomeRenderDetails(result.value.username)
                    responseDetails['auth_token'] = auth_token
                    res.render('home', responseDetails)
                }
            }
        }
    }
})

app.post('/signup', (req, res) => {
    // validate request body
    const result = joi.validate(req.body, validators['signup'])

    // check if validations fail
    if(result.error) {
        if (result.value.cli) {
            res.status(400).send({'message': result.error.details[0].message})
        } else {
            res.status(400).render('landing', {'message': result.error.details[0].message})
        }
    } else {
        // check if username exists in DB (username must be unique)
        if (result.value.username in user_details) {
            if(result.value.cli) {
                res.status(400).send({'message': messages['usernameDup']})
            } else {
                res.status(400).render('landing', {'message': messages['usernameDup']})
            }
        } else {
            // everyhing checks out!

            // make a new user
            user_details[result.value.username] = {
                'name': result.value.name,
                'password': result.value.password,
                'isAdmin': result.value.isAdmin,
            }
            
            // create 'session'
            var auth_token = generateAuthToken()
            sessions[auth_token] = result.value.username

            if (result.value.cli) {
                var responseDetails = {
                    'auth_token': auth_token,
                    'message': messages['loginOK']
                }
                res.send(responseDetails)
            } else {
                // add details for rendering the next page
                var responseDetails = prepareHomeRenderDetails(result.value.username)
                responseDetails['auth_token'] = auth_token
                res.render('home', responseDetails)
            }
        }
    }
})

app.post('/logout', (req, res) => {
    // getting body contents in a more friendly format
    const result = joi.validate(req.body, validators['authorized'])
    // delete session
    delete sessions[result.value.auth_token]
    
    // prepare response vars
    var responseDetails = {
        'message': messages['logoutOK']
    }

    // send response
    if (result.value.cli) {
        res.send(responseDetails)
    } else {
        res.render('landing', responseDetails)
    }
})

app.post('/list', (req, res) => {
    res.send(course_details)
})

app.post('/listRegistered', (req, res) => {
    const current_user = sessions[req.body['auth_token']]

    if (user_details[current_user]['isAdmin']) {
        // a list of all students in registered courses
        res.send(registrations)
    } else {
        // a list of all courses the student is registered in
        var registeredCourses = {}
        for (var courseCode in registrations) {
            if (registrations[courseCode].indexOf(current_user) != -1) {
                registeredCourses[courseCode] = course_details[courseCode]
            }
        }
        res.send(registeredCourses) 
    }
})

app.post('/course', (req, res) => {
    // validate the request body
    const result = joi.validate(req.body, validators['courseDetails'])

    if(result.error) {
        if(result.value.cli) {
            var responseDetails = {
                'message': result.error.details[0].message
            }
            res.send(responseDetails)
        } else {
            var responseDetails = prepareHomeRenderDetails(sessions[result.value.auth_token])
            responseDetails['auth_token'] = result.value.auth_token
            responseDetails['message'] = "Select a valid option!"
            res.render('home', responseDetails)
        }
    } else {
        // check if course code does not exist
        if(!(result.value.courseCode in course_details)) {
            if(result.value.cli) {
                var responseDetails = {'message': messages['courseDNE']}
                res.send(responseDetails)
            } else {
                var responseDetails = prepareHomeRenderDetails(sessions[result.value.auth_token]) 
                responseDetails['auth_token'] = result.value.auth_token
                responseDetails['message'] = messages['courseDNE']
                res.render('home', responseDetails)
            }
        } else {
            // everything checks out!

            // preparing data for render/delivery

            var responseDetails = {
                'courseCode': result.value.courseCode,
                'courseDesc': course_details[result.value.courseCode]['desc'],
                'courseStartDate': course_details[result.value.courseCode]['startDate'],
                'courseCommenced': new Date() > course_details[result.value.courseCode]['startDate'],
                'numberRegistered': (result.value.courseCode in registrations)?registrations[result.value.courseCode].length:0
            }
            responseDetails['courseActive'] = (responseDetails['numberRegistered'] >= 5)

            if(!user_details[sessions[result.value.auth_token]]['isAdmin']) {
                // check if student is enrolled in this course
                responseDetails['enrolled'] = (result.value.courseCode in registrations)?(registrations[result.value.courseCode].indexOf(sessions[result.value.auth_token]) != -1):false
            }

            // add a current status of course
            // if the course date has passed
            if(responseDetails['courseCommenced']) {
                // if course active
                if(responseDetails['courseActive']) {
                    responseDetails['status'] = "The course has started"
                    
                    // if student
                    if('enrolled' in responseDetails) {
                        // if enrolled in course
                        if(responseDetails['enrolled']) {
                            responseDetails['status'] += " and you have registered for it."
                        } else {
                            responseDetails['status'] += " and registrations are closed. You cannot register for this course."
                        }
                    }
                } else {
                    responseDetails['status'] = "Insufficient students registered for the course. This course has been cancelled."
                    // if student
                    if('enrolled' in responseDetails) {
                        if(responseDetails['enrolled']) {
                            responseDetails['status'] += " Your registration will be withdrawn."
                        }
                    }
                }
            } else {
                responseDetails['status'] = "Course is yet to begin"
                // if student
                if ('enrolled' in responseDetails) {
                    // if enrolled in course
                    if (responseDetails['enrolled']) {
                        responseDetails['status'] += " and you've enrolled in it."
                    } else {
                        responseDetails['status'] += " and is open for registrations."
                    }
                } else {
                    responseDetails['status'] += " and is open for registrations."
                }
            }

            if(result.value.cli) {
                res.send(responseDetails)
            } else {
                responseDetails['auth_token'] = result.value.auth_token
                responseDetails['isAdmin'] = user_details[sessions[result.value.auth_token]]['isAdmin']
                res.render('course', responseDetails)
            }
        }
    }
})

app.post('/add', (req, res) => {
    // validate the request body
    const result = joi.validate(req.body, validators['addCourse'])

    if(result.error) {
        if(result.value.cli) {
            var responseDetails = {
                'message': result.error.details[0].message
            }
            res.send(responseDetails)
        } else {
            var responseDetails = prepareHomeRenderDetails(sessions[result.value.auth_token])
            responseDetails['auth_token'] = result.value.auth_token
            responseDetails['message'] = result.error.details[0].message
            res.render('home', responseDetails)
        }
    } else {
        // check if course code is in courses (no duplicate courses)
        if(result.value.courseCode in course_details) {
            if(result.value.cli) {
                var responseDetails = {'message': messages['courseDup']}
                res.send(responseDetails)
            } else {
                var responseDetails = prepareHomeRenderDetails(sessions[result.value.auth_token]) 
                responseDetails['auth_token'] = result.value.auth_token
                responseDetails['message'] = messages['courseDup']
                res.render('home', responseDetails)
            }
        } else {
            // check if user is student
            if (!user_details[sessions[result.value.auth_token]]['isAdmin']) {
                if(result.value.cli) {
                    var responseDetails = {'message': messages['privError']}
                    res.send(responseDetails)
                } else {
                    var responseDetails = prepareHomeRenderDetails(sessions[result.value.auth_token]) 
                    responseDetails['auth_token'] = result.value.auth_token
                    responseDetails['message'] = messages['genError']
                    res.render('home', responseDetails)
                }
            } else {
                // everything checks out!
                
                // adding course to course_details
                course_details[result.value.courseCode] = {
                    'desc': result.value.courseDesc,
                    'startDate': result.value.courseStartDate
                }

                
                if(result.value.cli) {
                    var responseDetails = {
                        'message': messages['courseAddOK']
                    }
                    res.send(responseDetails)
                } else {
                    var responseDetails = prepareHomeRenderDetails(sessions[result.value.auth_token])
                    responseDetails['auth_token'] = result.value.auth_token
                    responseDetails['message'] = messages['courseAddOK']
                    res.render('home', responseDetails)
                }
            }
        }
    }
})

app.post('/delete', (req, res) => {
    // validate the request body
    const result = joi.validate(req.body, validators['courseOps'])

    if(result.error) {
        if(result.value.cli) {
            var responseDetails = {
                'message': result.error.details[0].message
            }
            res.send(responseDetails)
        } else {
            var responseDetails = {'message': messages['genError']}
            res.render('landing', responseDetails)
        }
    } else {
        // check if course code does not exist in courses
        if(!(result.value.courseCode in course_details)) {
            if(result.value.cli) {
                var responseDetails = {'message': messages['courseDNE']}
                res.send(responseDetails)
            } else {
                var responseDetails = {'message': messages['genError']}
                res.render('landing', responseDetails)
            }
        } else {
            // check if user is student
            if (!user_details[sessions[result.value.auth_token]]['isAdmin']) {
                if(result.value.cli) {
                    var responseDetails = {'message': messages['privError']}
                    res.send(responseDetails)
                } else {
                    var responseDetails = {'message': messages['genError']}
                    res.render('landing', responseDetails)
                }
            } else {
                // everything checks out!
                
                // removing course from course_details
                delete course_details[result.value.courseCode]

                // if any registrations existed, removing them too
                if (result.value.courseCode in registrations) {
                    delete registrations[result.value.courseCode]
                }
                
                if(result.value.cli) {
                    var responseDetails = {
                        'message': messages['courseDelOK']
                    }
                    res.send(responseDetails)
                } else {
                    var responseDetails = prepareHomeRenderDetails(sessions[result.value.auth_token])
                    responseDetails['auth_token'] = result.value.auth_token
                    responseDetails['message'] = messages['courseDelOK']
                    res.render('home', responseDetails)
                }
            }
        }
    }
})

app.post('/register', (req, res) => {
    // validate the request body
    const result = joi.validate(req.body, validators['courseOps'])

    if(result.error) {
        if(result.value.cli) {
            var responseDetails = {
                'message': result.error.details[0].message
            }
            res.send(responseDetails)
        } else {
            var responseDetails = {'message': messages['genError']}
            res.render('landing', responseDetails)
        }
    } else {
        // check if course code does not exist in courses
        if(!(result.value.courseCode in course_details)) {
            if(result.value.cli) {
                var responseDetails = {'message': messages['courseDNE']}
                res.send(responseDetails)
            } else {
                var responseDetails = {'message': messages['genError']}
                res.render('landing', responseDetails)
            }
        } else {
            // check if user is admin
            if (user_details[sessions[result.value.auth_token]]['isAdmin']) {
                if(result.value.cli) {
                    var responseDetails = {'message': messages['privError']}
                    res.send(responseDetails)
                } else {
                    var responseDetails = {'message': messages['genError']}
                    res.render('landing', responseDetails)
                }
            } else {
                // check if course has started
                if(new Date() > course_details[result.value.courseCode]['startDate']) {
                    if(result.value.cli) {
                        var responseDetails = {'message': messages['courseStarted']}
                        res.send(responseDetails)
                    } else {
                        var responseDetails = {'message': messages['genError']}
                        res.render('landing', responseDetails)
                    }
                } else {
                    // everything checks out!
                    
                    // if course exists in registrations
                    if(result.value.courseCode in registrations) {
                        // adding student to registrations
                        registrations[result.value.courseCode].push(sessions[result.value.auth_token])
                    } else {
                        // adding course and student to registrations
                        registrations[result.value.courseCode] = [sessions[result.value.auth_token]]
                    }
                    
                    if(result.value.cli) {
                        var responseDetails = {
                            'message': messages['courseRegOK']
                        }
                        res.send(responseDetails)
                    } else {
                        var responseDetails = prepareHomeRenderDetails(sessions[result.value.auth_token])
                        responseDetails['auth_token'] = result.value.auth_token
                        responseDetails['message'] = messages['courseRegOK']
                        res.render('home', responseDetails)
                    }
                }
            }
        }
    }
})

app.post('/deregister', (req, res) => {
    // validate the request body
    const result = joi.validate(req.body, validators['courseOps'])

    if(result.error) {
        if(result.value.cli) {
            var responseDetails = {
                'message': result.error.details[0].message
            }
            res.send(responseDetails)
        } else {
            var responseDetails = {'message': messages['genError']}
            res.render('landing', responseDetails)
        }
    } else {
        // check if course code does not exist in courses
        if(!(result.value.courseCode in course_details)) {
            if(result.value.cli) {
                var responseDetails = {'message': messages['courseDNE']}
                res.send(responseDetails)
            } else {
                var responseDetails = {'message': messages['genError']}
                res.render('landing', responseDetails)
            }
        } else {
            // check if user is admin
            if (user_details[sessions[result.value.auth_token]]['isAdmin']) {
                if(result.value.cli) {
                    var responseDetails = {'message': messages['privError']}
                    res.send(responseDetails)
                } else {
                    var responseDetails = {'message': messages['genError']}
                    res.render('landing', responseDetails)
                }
            } else {
                // check if course has started
                if(new Date() > course_details[result.value.courseCode]['startDate']) {
                    if(result.value.cli) {
                        var responseDetails = {'message': messages['courseStarted']}
                        res.send(responseDetails)
                    } else {
                        var responseDetails = {'message': messages['genError']}
                        res.render('landing', responseDetails)
                    }
                } else {
                    // everything checks out!

                    // if only student in course
                    if(registrations[result.value.courseCode].length === 1) {
                        // removing course and student from registrations
                        delete registrations[result.value.courseCode]
                    } else {
                        // removing student
                        registrations.splice(registrations[result.value.courseCode].indexOf(sessions[result.value.auth_token]), 1)
                    }

                    if(result.value.cli) {
                        var responseDetails = {
                            'message': messages['courseDeregOK']
                        }
                        res.send(responseDetails)
                    } else {
                        var responseDetails = prepareHomeRenderDetails(sessions[result.value.auth_token])
                        responseDetails['auth_token'] = result.value.auth_token
                        responseDetails['message'] = messages['courseDeregOK']
                        res.render('home', responseDetails)
                    }
                }
            }
        }
    }
})

app.get('/', (req, res) => {
    res.render('landing')
})

app.get('*', (req, res) => {
    res.redirect('/')
})

app.post('*', (req, res) => {
    res.status(404).send({message: messages['invalidURL']})
})

app.listen(portNum)
console.log("Server is listening on port", portNum)
