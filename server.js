const express = require('express')
const joi = require('joi')
const app = express()

app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(express.static('./public'))

app.set('views', './views')
app.set('view engine', 'pug')

const portNum = 3000

/*
Data Structures
user_details = {
    user_id: {
        name: XYZ,
        sesh_token: XYZ.
        password: XYZ,
        admin: false
    }
}

courses = {
    course_id: {
        name: XYZ,
        desc: XYZ,
        start_data: XYZ,
        registered: [user_id, user_id]
    }
}
*/

/* 
PLAN
HELPER FNs
validateUser(auth_token)
    if exists, user_id
    else, None

generateAuthToken()

Middleware
    if validateUser(auth_token)
        next with params {token}
    else
        redir to '/'


Routes
/ (GET)
    if cli
        send list of commands
    else
        if validateUser(auth_token)
            redirect to home
        else
            render signup/login

/ (POST)
    if cli
        send list of commands
    else
        if validateUser(auth_token)
            redirect to home
        else
            render signup/login    

/signup (POST)
    get username, password
    if valid
        add to user_details
        generate token
        redir to home with token/send message (not token)
    else
        send appropiate message
        (CLI get message, GUI gets pug page with message)

/login (POST)
    get username, password. 
    if correct
        generate token
        redir to home with token/send token
    else 
        send appropiate message
        (CLI gets message, GUI gets pug page with message)

/home (POST)
    get type from validateUser(auth_token) 
    if admin
        show admin
    else
        show student

/course/:id (POST)
    get course id, validate
    if cli

/list (POST)
    get type from validateUser(auth_token)
    if admin
        render course list page/send dict of course details
    else
        render course list page/send dict of course details

/listRegistered (POST)
    get type from validateUser(auth_token)
    if admin
        get course_id from body
        render registered student list/send dict of registered students
    else
        compute list of courses registered, get details
        render list of registered courses/send dict

/course/:id (POST)
    get type from validateUser(auth_token)
    prep details
    render course page/send dict of details

/add (POST)
    only if admin

/remove (POST)
    only if admin

/register (POST)
    only if student

/register (POST)
    only if student
   


PAGES
landing (signin/login)
home
course
allcourses
    
Interfaces
ADMIN
    to show (GUI)
        - current courses
            - name
            - commencement date
            - number of students registered
            - remove course option
        - add a course
            - course
    
    to allow (CLI)
        - /listRegistered
            - auth_token (input)
            - course_id (input)
            - list of students (output)
        - /list
            - auth_token (input)
            - dict of courses (output)
                for each course
                - name
                - commencement date
                - number of students registered
        - /course/:id
            - auth_token (input)
            - course details (output)
        - /add
            - course name (input)
            - description (input)
            - date (input)
            - cli (input)
            - auth_token (input)
            - course id (output)
            - message (output)
        - /remove
            - auth_token (input)
            - course id (input)
            - message (output)

STUDENT
    to show (GUI)
        - current courses
            - name
            - commencement date
            - status
            - deregister option
        - register in a course
            - Must show all courses
            - Disable those which haven't been registered yet
    
    to allow (CLI) 
        - /listRegistered
            - auth_token (input)
            - dict of current courses (output)
                for each course
                - name
                - commencement date
                - status
        - /list
            - auth_token (input)
            - dict of courses (output) 
                for each course
                - name
                - commencement date
                - status
        - course/:id
            - auth_token (input)
            - details of the course
        - /register
            - auth_token (input)
            - course_id (input)
            - message (output)
        - /deregister
            - auth_token (input)
            - course_id (input) 
            - message (output)
*/

var user_details = {
    'harsh': {
        'name': 'Harsh',
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
        'startDate': "04/03/2019"
    } 
}

var registrations = {
    'CSE1001': ['harsh']
}

var sessions = {}

const cli_authenticator = joi.boolean().allow(null).default(false)
const auth_token_authenticator = joi.string().length(26).required()
const courseCode_authenticator = joi.string().length(7).required()

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
    'courseAddOK': "Course added successfully!",
    'courseDelOK': "Course deleted successfully!",
    'authMissing': "You have to log in to access that!",
    'authMissingCLI': "You have to log in to access that! Provide auth_token",
    'authError': "Invalid token!",
    'privError': "Insufficient privileges!",
    'invalidURL': "The requested URL does not exist",
    'genError': "Whoops, something went wrong! Login again"
}

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
                // TODO: ADD VALID ENDPOINTS LIST HERE
                return res.send({'message': ['LIST OF VALID ENDPOINTS']})
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
                    // TODO: ADD VALID ENDPOINTS LIST HERE
                    return res.send({'message': ['LIST OF VALID ENDPOINTS']})
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
                'courseCommenced': true, // TODO: fix this
                'numberRegistered': (result.value.courseCode in registrations)?registrations[result.value.courseCode].length:0
            }
            responseDetails['courseActive'] = (responseDetails['numberRegistered'] >= 5)

            if(!user_details[sessions[result.value.auth_token]]['isAdmin']) {
                // check if student is enrolled in this course
                responseDetails['enrolled'] = (registrations[result.value.courseCode].indexOf(sessions[result.value.auth_token]) != -1)
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
                        responseDetails['status'] += " You may deregister from this course."
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
            var responseDetails = prepareHomeRenderDetails(sessions[result.value.auth_token])
            responseDetails['auth_token'] = result.value.auth_token
            responseDetails['message'] = messages['genError']
            res.render('home', responseDetails)
        }
    } else {
        // check if course code does not exist in courses
        if(!(result.value.courseCode in course_details)) {
            if(result.value.cli) {
                var responseDetails = {'message': messages['courseDNE']}
                res.send(responseDetails)
            } else {
                var responseDetails = prepareHomeRenderDetails(sessions[result.value.auth_token]) 
                responseDetails['auth_token'] = result.value.auth_token
                responseDetails['message'] = messages['genError']
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
