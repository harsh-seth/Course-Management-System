# Course-Management-System
A system for educational institutes to facilitate course registration. Developed in Node.JS with a Pug view engine, it has access for faculties and students. It also has a dedicated nogui API interface. It implments a pseudo - sessions system which helps keep track of users and serves as authentication

## Installation
Clone the repository onto your local machine, navigate into the folder with the project files and run the ``` npm install ``` command. It should fetch the ```express```, ```pug``` and ```joi``` packages and install them locally. Your copy of the project should be good to go. Simply run ```node server.js``` to start an instance of the project.


## Features
+ Two types of users - students and admins
+ A course requires a minimum of 5 students to be active
+ Courses have a starting date. Students can register and deregister from courses any number of times before the starting date.
+ Admins can ```add``` new courses, view a ```list``` of all courses currently in the system, view ```course``` status and ```delete``` courses from the web interface
+ Admins can fetch a list of all students registered in a course in addition to the above via the API
+ Students can view ```course``` status, view a list of all courses currently registered, view a ```list``` of all courses currently in the system, ```register``` to a course and ```deregister``` from a course
+ Students can do the same via the API
+ All validations are made and the system is robust, with well defined messages to aid the user
+ Upon starting a session, an ```auth_token``` is provided by the server which has to be passed in every request to serve as authentication. It will also help enforce privileges
+ Passing ```"cli": true``` in a request will deliver messages and JSON objects rather than serve HTML pages. This is for the nogui API interface
+ Has reusable validators for joi and standardized messages as outputs


## Dummy Data for Demonstrations
The application is loaded with 7 users to demonstrate the different functionalities. When starting a proper instance, be sure to empty the ```user_details```, ```course_details``` and ```registrations``` dictionaries.

The dummy logins are as follows

| username | password | role |
|----------|----------|------|
| admin | 1234 | admin |
| alice | 1234| student |
| bob | 1234 | student |
| clara | 1234 | student |
| drew | 1234 | student |
| eliot | 1234 | student |
| felicity | 1234 | student |


## API Reference (with ```"cli": true```)
+ ```/```

  Returns a list of all possible API endpoints.
  Does not expect any other body parameters, will accept an optional ```"auth_token": auth_token```.

+ ```/home```
 
  Returns a list of all possible API endpoints.
  Same as ```/```.

+ ```/signup```

  Creates a new user. Requires a ```username```, ```password```, ```name``` and a boolean value ```isAdmin``` indicating if the user is an admin, or a student. It starts a session and returns an ```auth_token```.

+ ```/login```

  Logs in a user. Requires a ```username``` and ```password```. It starts a session and returns an ```auth_token```.

+ ```/logout```

  Logs out a user. Requires an ```auth_token```. It ends the session.

+ ```/list```

  Returns a dictionary of course details. It requires an ```auth_token```.

+ ```/listRegistered```

  It has two outputs. 
  
  If the user accessing it is an admin, then it returns a dictionary with key as course code and value as a list of usernames registered to that course, i.e. a dictionary of all registrations.

  If the user accessing it is a student, then it returns a dictionary of course details of all the courses registered by that student.

  It requires an ```auth_token```.

+ ```/course```

  Returns details about queried course, as well as current status. It requires an ```auth_token``` and ```courseCode```.

+ ```/add```

  Adds a course to the database. This is a privileged operation and only admins can perform this. It requires an ```auth_token```, ```courseCode```, ```courseDesc```, ```courseStartDate```.

+ ```/delete```

  Deletes a course from the database. Also removes all registrations associated with it. This is an admin only operation. It requires an ```auth_token``` and ```courseCode```.

+ ```/register```

  Registers a student to a course. This is a student only operation. It checks if the last date has passed, prevents operation if so. It requires an ```auth_token``` and ```courseCode```.

+ ```/deregister```

  Deregisters a student from a course. This is a student only operation. It checks if the last date has passed, prevents operation if so. It requires an ```auth_token``` and ```courseCode```.
