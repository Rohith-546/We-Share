require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const md5 = require('md5');
const mongoose = require("mongoose");
const path = require('path');
const app = express();
app.use(bodyParser.json());
app.use(bodyParser({ limit: '50mb' }));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const Schema = mongoose.Schema;

const uri = process.env.URL;
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const mimetypes = ["text/plain","image/jpeg", "image/png", "image/jpg", "application/pdf", "application/msword", "application/vnd.ms-powerpoint","application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",];


var islogin = false;

const userSchema = {
    userName: String,
    password: String
};

const User = mongoose.model("User", userSchema);

const subjectSchema = {
    bysn: String,
    subjectName: [{ type: String, unique: true }]
};

const Subject = mongoose.model("Subject", subjectSchema);


const fileSchema = new Schema({
    bys: String,
    subject: String,
    file: [{
        id: String,
        filetype: String,
        filename: String,
        f_size: Number,
        rf: Buffer
    }]
});


const Upload = mongoose.model("Upload", fileSchema);

app.get('/', (req, res) => {
    res.render("index",{
        islogin: islogin
    });
});

app.get('/home', (req, res) => {
    res.render("home", {
        islogin: islogin
    });
});

app.get('/login', (req, res) => {
    if(islogin===true){
        res.redirect('/home');
    } else{
        res.render("login",{
            islogin: islogin,
            error: ""
        });
    }
});

app.get("/logout", (req, res) => {
    islogin = false;
    res.redirect("/");
});

app.get("/home/:bys", (req, res) => {
    const bys = req.params.bys.toLowerCase();
    Subject.findOne({ bysn: bys }, (err, found) => {
        if (err) {
            console.log(err);
        } else {
            res.render("subject", {
                islogin: islogin,
                bys: bys,
                subjectName: found.subjectName
            });
        }
    });

});


app.get("/delete/:bys/:subject", (req, res) => {
    const bys = req.params.bys.toLowerCase();
    const my_subject = req.params.subject;

    Subject.findOne({ bysn: bys }, (err, found) => {

        if (err) {
            console.log(err);
        } else {
            const index = found.subjectName.indexOf(my_subject);
            found.subjectName.splice(index, 1);
            found.save();
        }
    });
    Upload.deleteMany({ bys: bys, subject: my_subject }, (err) => {
        if (err) {
            console.log(err);
        } else {
            res.redirect("/home/" + bys);
        }
    });
});


app.get("/delete/:bys/:subject/:fname", (req, res) => {
    const bys = req.params.bys.toLowerCase();
    const my_subject = req.params.subject;
    const filename = req.params.fname

    Upload.findOne({ bys: bys, subject: my_subject }, (err, found) => {
        if (err) {
            console.log(err);
        } else {
            const index = found.file.findIndex(x => x.filename === filename);
            found.file.splice(index, 1);
            found.save();
            res.redirect("/home/" + bys + "/" + my_subject+"/files");
        }
    });
});


app.get("/home/:bys/:subject/files", (req, res) => {
    const bys = req.params.bys.toLowerCase();
    const my_subject = req.params.subject;
    Upload.findOne({ bys: bys, subject: my_subject }, (err, found) => {
        if (err) {
            console.log(err);
        } else {
            if (found) {
                res.render("files", {
                    islogin: islogin,
                    bys: bys,
                    subject: my_subject,
                    file: found.file
                });
            } else {
                res.render("files", {
                    islogin: islogin,
                    bys: bys,
                    subject: my_subject,
                    file: []
                });
            }
        }
    });
});

app.get("/home/:bys/:subject/upload", (req, res) => {
    const bys = req.params.bys.toLowerCase();
    const my_subject = req.params.subject;
    res.render("upload", {
        islogin: islogin,
        bys: bys,
        my_subject: my_subject
    });
});

app.post("/upload/:bys/:subject", (req, res) => {
    const bys = req.params.bys.toLowerCase();
    const my_subject = req.params.subject;
    const my_file = req.body.file;

    const pdf_file = JSON.parse(my_file);

    Upload.findOne({ bys: bys, subject: my_subject }, (err, found) => {
        if (err) {
            console.log(err);
        } else {
            if (found) {
                if(pdf_file!=null && mimetypes.includes(pdf_file.type)){ 
                        found.file.push({
                            filetype: pdf_file.type,
                            filename: pdf_file.name,
                            f_size: (pdf_file.size)/1024,
                            rf: pdf_file.data
                        });
                        found.save();
                }
            } else {
                if (pdf_file != null && mimetypes.includes(pdf_file.type)) {
                    const newUpload = new Upload({
                        bys: bys,
                        subject: my_subject,
                        file: [{
                            filetype: pdf_file.type,
                            filename: pdf_file.name,
                            f_size: (pdf_file.size) / 1024,
                            rf: pdf_file.data
                        }]
                    });
                    newUpload.save();
            }
        }
    }
});
    res.redirect("/home/" + bys + "/" + my_subject + "/files");
});


app.post("/add-subject/:bys", (req, res) => {
    const bysn = req.params.bys.toLowerCase();
    const subjectName = req.body.subjectName.toUpperCase();
    Subject.findOne({ bysn: bysn }, (err, foundSubject) => {
        if (err) {
            console.log(err);
        } else {
            if (foundSubject) {
                if (foundSubject.subjectName.includes(subjectName)) {
                    res.redirect("/home/" + bysn);
                } else {

                foundSubject.subjectName.push(subjectName);
                foundSubject.save();
                res.redirect("/home/" + bysn);
            }
        }
        }
    });
});


app.post('/login', (req, res) => {
    const username = req.body.username.toLowerCase();
    const password = req.body.password;
        User.findOne({ username: username, password: md5(password+process.env.SECRET_KEY) }, (err, foundUser) => {
            if (err) {
                console.log(err);
            } else {
                if (foundUser) {
                    islogin = true;
                    res.redirect("/home");
                } else {
                    res.render("login", {
                        islogin: islogin,
                        error: "*Invalid Username or Password",
                    });
                }
            }
        });
});

app.post("/home", (req, res) => {
    const branch = req.body.branch;
    const year = req.body.year;
    const sem = req.body.sem;
    res.redirect("/home/" + branch + "-" + year + "-" + sem);
});

app.listen(process.env.PORT || 3000, function () {
    console.log("port 3000 activated...");
});
