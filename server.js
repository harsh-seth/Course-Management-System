const express = require('express')
// const joi = require('joi')
const app = express()

app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(express.static('./public'))

app.set('view', './views')
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

generateToken()

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

app.get('*', (req, res) => {
    res.status(404).send('Invalid URL')
})
app.post('*', (req, res) => {
    res.status(404).send('Invalid URL')
})

app.listen(portNum)
console.log("Server is listening on port", portNum)
