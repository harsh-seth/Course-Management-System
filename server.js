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
    }
}

var sessions = {}

const cli_authenticator = joi.boolean().allow(null).default(false)
const auth_token_authenticator = joi.string().length(26).required()

const validators = {
    'cli': {
        'cli': cli_authenticator
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
    'signout': {
        'cli': cli_authenticator,
        'auth_token': auth_token_authenticator
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
    'authMissing': "You have to sign in to access that!",
    'authError': "Invalid token!",
    'genError': "Whoops, something went wrong!"
}

function generateAuthToken() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

app.post('/login', (req, res) => {
    // validate body contents
    const result = joi.validate(req.body, validators['login'])
    
    // check if validation fails 
    if (result.error) {
        if (result.value.cli === true) {
            res.status(400).send(result.error.details[0].message)
        } else {
            res.status(400).render('landing', {'message': result.error.details[0].message})
        }
    } else {
        // check if username does not exists in DB
        if (!(result.value.username in user_details)) {
            if(result.value.cli) {
                res.status(400).send(messages['userDNE'])
            } else {
                res.status(400).render('landing', {'message': messages['userDNE']})
            }
        } else {
            // check if password does not match
            if (result.value.password !== user_details[result.value.username]['password']) {
                if (result.value.cli) {
                    res.status(400).send(messages['wrongPW'])
                } else {
                    res.status(400).render('landing', {'message': messages['wrongPW']})
                }
            } else {
                // everything checks out!
                
                // create 'session'
                var auth_token = generateAuthToken()
                sessions[auth_token] = result.value.username

                // prepare response vars
                var responseDetails = {
                    'auth_token': auth_token
                }

                if (result.value.cli) {
                    // add message for information
                    responseDetails['message']  = messages['loginOK']
                    res.send(responseDetails)
                } else {
                    // add details for rendering the next page
                    responseDetails['name'] = user_details[result.value.username]['name']
                    responseDetails['isAdmin'] = user_details[result.value.username]['isAdmin']
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
        if (result.value.cli === true) {
            res.status(400).send(result.error.details[0].message)
        } else {
            res.status(400).render('landing', {'message': result.error.details[0].message})
        }
    } else {
        // check if username exists in DB (username must be unique)
        if (result.value.username in user_details) {
            if(result.value.cli) {
                res.status(400).send(messages['usernameDup'])
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

            // prepare response vars
            var responseDetails = {
                'auth_token': auth_token
            }

            if (result.value.cli) {
                // add message for information
                responseDetails['message']  = messages['signupOK']
                res.send(responseDetails)
            } else {
                // add details for rendering the next page
                responseDetails['name'] = user_details[result.value.username]['name']
                responseDetails['isAdmin'] = user_details[result.value.username]['isAdmin']
                res.render('home', responseDetails)
            }
        }
    }
})

app.post('/logout', (req, res) => {
    // validate request body
    const result = joi.validate(req.body, validators['signout'])

    // check if validations fail
    if(result.error) {
        if (result.value.cli === true) {
            res.status(400).send(result.error.details[0].message)
        } else {
            res.status(400).render('landing', {'message': messages['genError']})
        }
    } else {
        // check if session with that token doesn't exist
        if (!(result.value.auth_token in sessions)) {
            if(result.value.cli) {
                res.status(400).send(messages['authError'])
            } else {
                res.status(400).render('landing', {'message': messages['genError']})
            }
        } else {
            // everyhing checks out!

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
        }
    }
})

app.get('*', (req, res) => {
    res.status(404).send('Invalid URL')
})
app.post('*', (req, res) => {
    res.status(404).send('Invalid URL')
})

app.listen(portNum)
console.log("Server is listening on port", portNum)
