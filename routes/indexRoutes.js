
const express = require("express");
const TimeToMove = require("../src/TimeToMove.js");
const multer = require('multer');
const path = require('path');
const router = express.Router();
const fs = require('fs');
const archiver = require('archiver');

router.get("/create_user", (req, res) => {
    return res.render('TimeToMove/register.ejs',{ session: req.session })
});

router.post('/create_user', async (req, res) => {
    const { username, email, password, isPublic } = req.body;
    
    try {
        // Call the createUser function to generate the token and send email
        const result = await TimeToMove.createUser(username, email, password, isPublic === 'true');

        if (result.success) {
            // Redirect the user to the /verify route after email is sent
            return res.redirect('/verify');
        } else {
            // Handle error (e.g., username or email already exists)
            return res.render('TimeToMove/index.ejs', { errorMessage: result.message, session: req.session });
        }
    } catch (error) {
        console.error('Error during registration:', error);
        return res.status(500).send('Error during registration.');
    }
});

router.get("/create_fake_user", (req, res) => {
    return res.render('TimeToMove/fakeRegister.ejs',{ session: req.session })
});

router.post('/create_fake_user', async (req, res) => {
    const { username, email, password, isPublic } = req.body;
    
    try {
        // Call the createFAKKEEEUser function to generate the token and send email
        const result = await TimeToMove.createFakeUser(username, email, password, isPublic === 'true');

        if (result.success) {
            // Redirect the user to the /verify route after email is sent
            return res.redirect('/fakeVerify');
        } else {
            // Handle error (e.g., username or email already exists)
            return res.render('TimeToMove/index.ejs', { errorMessage: result.message, session: req.session });
        }
    } catch (error) {
        console.error('Error during registration:', error);
        return res.status(500).send('Error during registration.');
    }
});

router.get('/fakeVerify', (req, res) => {
    // Render the verify page where the user will input the token
    res.render('TimeToMove/fakeVerify.ejs',{ user: req.session.user,session: req.session });  // Render a view for token input
});

// Route to handle token verification
router.post('/fakeVerify', async (req, res) => {
    const { token } = req.body;

    try {
        // Call the verify function in TimeToMove.js
        const result = await TimeToMove.fakeVerify(token);

        if (result.success) {
            return res.redirect('/login');
        } else {
            //res.status(400).send(result.message);  // Send error message
            return res.redirect('/create_fake_user');
        }
    } catch (error) {
        console.error('Error during verification:', error);
        res.status(500).send('Server error during verification.');
    }
});

router.get('/', (req, res) => {
    const isLoggedIn = !!req.session.user;  // Check if the user is logged in

    if (isLoggedIn) {
        // If the user is logged in, show the dashboard or custom content
        res.render('TimeToMove/index.ejs', { user: req.session.user,session: req.session });
    } else {
        // If not logged in, show the homepage or a general landing page
        res.render('TimeToMove/index.ejs',{ user: req.session.user,session: req.session });
    }
});


router.get('/verify', (req, res) => {
    // Render the verify page where the user will input the token
    res.render('TimeToMove/verify.ejs',{ user: req.session.user,session: req.session });  // Render a view for token input
});

// Route to handle token verification
router.post('/verify', async (req, res) => {
    const { token } = req.body;

    try {
        // Call the verify function in TimeToMove.js
        const result = await TimeToMove.verify(token);

        if (result.success) {
            return res.redirect('/login');
        } else {
            //res.status(400).send(result.message);  // Send error message
            return res.redirect('/create_user');
        }
    } catch (error) {
        console.error('Error during verification:', error);
        res.status(500).send('Server error during verification.');
    }
});



router.get("/forgot_password", (req, res) => {
    res.send("Forgot password page (coming soon)");  // Placeholder page
});

// Display the login form
router.get('/login', (req, res) => {
    res.render('TimeToMove/login.ejs', { errorMessage: "" ,session: req.session});
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await TimeToMove.loginUser(username, password);

        if (result.success) {
            // Store the user's information in the session
            req.session.user = {
                id: result.userId,
                username: result.username
            };

            // Redirect the user to their profile page (e.g., /username)
            return res.redirect(`/${result.username}`);
        } else {
            return res.render('TimeToMove/login.ejs', { errorMessage: result.message,session: req.session });
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Error during login.');
    }
});




router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Error logging out.');
        }
        res.redirect('/login');  // Redirect to the login page after logging out
    });
});


router.get('/account', async (req, res) => {
    // Check if the user is logged in
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const userId = req.session.user.id;  // Get the userID from the session
    console.log('Session user ID:', userId);  // Check if userId is correctly stored

    try {
        // Fetch all the boxes created by the logged-in user
        const userBoxes = await TimeToMove.getUserBoxes(userId);

        // Log the fetched boxes for debugging
        console.log('Fetched user boxes:', userBoxes);

        // Render the account page, passing the user's boxes
        res.render('TimeToMove/account.ejs', { user: req.session.user, boxes: userBoxes,session: req.session });
    } catch (error) {
        console.error('Error fetching user boxes:', error);
        res.status(500).send('Error loading account page.');
    }
});






// Add route to fetch all users and render the homepage
router.get("/all_users", async (req, res) => {
    console.log("index");
    let data = {};

    // Fetch all users from the database using the getAllUsers function
    try {
        data.users = await TimeToMove.getAllUsers();  // Assume getAllUsers() fetches all users
    } catch (error) {
        console.error('Error fetching users:', error);
        data.users = [];
    }

    res.render("TimeToMove/all_users.ejs", { data,user: req.session ,session: req.session});
});

router.post('/create_box', async (req, res) => {
    // Check if the user is logged in
    if (!req.session.user) {
        return res.redirect('/login');
    }
    const { label, isPublic } = req.body;
    const userId = req.session.user.id;  // Get the user ID from the session
    console.log("label", label);
    console.log("isPublic", isPublic);
    console.log("userId", userId);
    console.log("req.session.user", req.session.user);

    try {
        // Call the function to create a new box
        await TimeToMove.createBox(userId, isPublic === 'true', label);
        // After creating the box, redirect back to the account page
        res.redirect(`/${req.session.user.username}`);
    } catch (error) {
        console.error('Error creating box:', error);
        res.status(500).send('Error creating box.');
    }
});







router.get("/test", (req, res) => {
    res.render("TimeToMove/test.ejs");  // Your existing about page
});

router.get("/about", (req, res) => {
    res.render("TimeToMove/about.ejs");  // Your existing about page
});


router.get('/leaderboard', async (req, res) => { 
    try {
        // Fetch the leaderboard data and statistics from TimeToMove.js
        const { leaderboard, totalFilesUploaded, totalMediaSize, totalUsers } = await TimeToMove.getLeaderboardStats();

        // Render the leaderboard page with the fetched stats
        res.render('TimeToMove/leaderboard', { 
            user: req.session.user,
            session: req.session,
            leaderboard,
            totalFilesUploaded,
            totalMediaSize,
            totalUsers
        });
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        res.status(500).send('Error loading leaderboard.');
    }
});



router.get("/welcome", (req, res) => {
    res.render("TimeToMove/welcome.ejs");  // Your existing about page
});


router.get('/:username', async (req, res) => {
    const { username } = req.params;
    console.log("username", username);
    console.log("req.session", req.session);
    console.log("req.session.user", req.session.user); // undefined

    try {
        // Fetch the user by username
        const user = await TimeToMove.getUserByUsername(username);
        console.log('user:', user);  // Log the user object

        if (!user) {
            console.log('User not found:', username);  // Add log for debugging
            return res.status(404).send('User not found');
        }

        // Fetch the boxes created by the user
        const userBoxes = await TimeToMove.getUserBoxes(user.ID);
        console.log('userBoxes:', userBoxes);  // Log the user boxes
        console.log("user.username", user.Username); // felix
        console.log("req.session.user", req.session.user); // undefined
        //console.log("req.session.user.username", req.session.user.username); // error
        console.log("req.paramsUsername", req.params.username);
        console.log("the end");


        console.log("user.ID", user.ID);
        // Render the user's profile page
        res.render('TimeToMove/profile.ejs', {
            user,
            boxes: userBoxes,
            isOwner: req.session.user && req.session.user.username === user.Username,
            session: req.session
        });
    } catch (error) {
        console.error('Error loading user profile:', error);
        res.status(500).send('Error loading profile.');
    }
});


// Route for updating the user description
router.post('/:username/editDescription', async (req, res) => {
    const { username } = req.params;
    const { UserDescription } = req.body;

    try {
        // Ensure the logged-in user is the one trying to edit their profile
        if (req.session.user && req.session.user.username === username) {
            // Call the function in TimeToMove.js to update the description
            const result = await TimeToMove.updateUserDescription(username, UserDescription);

            if (result.success) {
                // Redirect back to the user's profile after updating the description
                return res.redirect(`/${username}`);
            } else {
                return res.render('TimeToMove/profile', {
                    user: req.session.user,
                    errorMessage: 'Error updating description',
                    session: req.session
                });
            }
        } else {
            return res.status(403).send('Unauthorized to edit this profile');
        }
    } catch (error) {
        console.error('Error updating description:', error);
        return res.status(500).send('Server error');
    }
});

// Route to update box name and description
router.post('/:username/:boxID/editBox', async (req, res) => {
    const { username, boxID } = req.params;
    const { newBoxName, newBoxDescription } = req.body;

    try {
        // Ensure the user is logged in and is the owner of the box
        if (req.session.user && req.session.user.username === username) {
            // Call the function to update the box
            await TimeToMove.updateBox(boxID, newBoxName, newBoxDescription);

            // Redirect back to the profile page
            res.redirect('/' + username);
        } else {
            res.status(403).send('Unauthorized to edit this box.');
        }
    } catch (error) {
        console.error('Error updating box:', error);
        res.status(500).send('Server error while updating box.');
    }
});




// Helper function to use fs.readFile with Promises
function readFilePromise(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                return reject(err);
            }
            resolve(data);
        });
    });
}

router.get('/:username/:boxName', async (req, res) => {
    const { username, boxName } = req.params;
    console.log("usernameAAAAASDASDASDASD", username);
    console.log("boxNameADASDASDASDASD", boxName);
    console.log(req.session.user);
    console.log(req.params);
    console.log(req.params.username);
    console.log("IDK");

    // if boxName is a number, it's a boxID
    // if boxName is a string, it's a boxName
    // Check if boxName is a number (indicating it's a boxID)
let boxID;
if (!isNaN(boxName)) {
    // boxName is a number, treat it as a boxID
    console.log("boxName is a number (boxID)");
    //boxID = await TimeToMove.getBoxByID(boxName);  // Fetch the box by boxID
    boxID = boxName;
} else {
    // boxName is a string, treat it as a boxName
    console.log("boxName is a string (boxName)");
    boxID = await TimeToMove.getBoxID(username, boxName);  // Fetch the box by boxName
    boxID = boxID[0].BoxID;
}
    console.log('boxID in usrname "boxname" upload:', boxID);
    if (!boxID) {
        return res.render('TimeToMove/boxContents', {
            errorMessage: 'Box not found',
            user,
            box: null, 
            contents: [],
            session: req.session
        });
    }
    console.log("BOX ID HEREEEE", boxID);

    try {
        console.log("Sanity check")
        const user = await TimeToMove.getUserByUsername(username);
        console.log("Lets log if the session user is the owner of the box", req.params.username, " AGAIN ",user.Username);
        console.log("STRAIGHT UPPP", user, " AGAIN ",username);

        if (!user) {
            return res.status(404).send('User not found');
        }
        console.log("boxID", boxID);
        console.log("user.ID", user.ID);
        const box = await TimeToMove.getBoxByID(user.ID, boxID);
        console.log("boxUSER BOX NAME", box);
        if (!box) {
            return res.status(404).send('Box not found');
        }
        const isOwner = req.params.username === user.Username;
        console.log("isOwner", isOwner);
        console.log("box", box);
        console.log("box[0]", box[0]);
        if (!box[0].IsBoxPublic && !isOwner) {
            return res.render('TimeToMove/boxContents', {
                errorMessage: 'Access denied, box is private.',
                user,
                box: null, // Pass null when box is not found
                contents: [],
                session: req.session
            });
        }

        const boxContents = await TimeToMove.getBoxContents(boxID);
        // Calculate total size of all files in the box
        const totalSize = boxContents.reduce((acc, content) => acc + content.MediaSize, 0);

        await Promise.all(boxContents.map(async content => {
            if (content.MediaType === 'txt') {
                const filePath = path.join(__dirname, '..', 'uploads', content.MediaPath);
                try {
                    content.textContent = await readFilePromise(filePath);
                } catch (err) {
                    console.error(`Error reading file at ${filePath}:`, err);
                    content.textContent = 'Error reading text file.';
                }
                content.fileName = path.basename(content.MediaPath);
            }
        }));

        res.render('TimeToMove/boxContents.ejs', {
            errorMessage: "",
            user,
            box,
            contents: boxContents,
            isOwner,
            totalSize,
            session: req.session
        });
    } catch (error) {
        console.error('Error loading box contents:', error);
        res.status(500).send('Error loading box contents.');
    }
});













// Set up multer for file uploads
// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        console.log("req.params.boxID", req.params.boxID);
        console.log("req.params.box", req.params.box);
        console.log("req.params", req.params);
        console.log("req.params.Username", req.params.username);
        console.log("req.params.boxName", req.params.boxName);
        //works
        console.log("This Shi fr works multer Disk storage");

        const uploadPath = path.join(__dirname, '..', 'uploads', req.params.username, req.params.boxName);
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
},
    filename: function (req, file, cb) {
        cb(null, file.originalname); // Save with original filename
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // Optional: Limit file size to 10MB
});

// POST route for handling file uploads
router.post('/:username/:boxName/upload', upload.fields([
    { name: 'imageFile', maxCount: 1 },
    { name: 'textFile', maxCount: 1 },
    { name: 'audioFile', maxCount: 1 }
]), async (req, res) => {
    const { username, boxName } = req.params;
    let gotThisFar = 0;
    console.log("gotThisFar", gotThisFar++);
    try {
        // Fetch the user and boxID
        const user = await TimeToMove.getUserByUsername(username);
        if (!user) {
            return res.render('TimeToMove/boxContents', {
                errorMessage: 'User not found',
                user: req.session.user,
                box: null, 
                contents: [],
                session: req.session
            });
        }
        const boxID = boxName;
        console.log('boxID IN UPLOAD', boxID);
       
        console.log("gotThisFar", gotThisFar++);

     

        // Handle different file types
        let file;
        if (req.files.imageFile) {
            file = req.files.imageFile[0];
        } else if (req.files.textFile) {
            file = req.files.textFile[0];
        } else if (req.files.audioFile) {
            file = req.files.audioFile[0];
        }
        console.log("gotThisFar", gotThisFar++);
        let numberHere = 123
        let stringHere = numberHere.toString();
        console.log("stringHere", stringHere);

        // Construct media path using boxID instead of boxName
        const mediaPath = path.join(username, boxID.toString(), file.originalname);
        console.log("gotThisFar", gotThisFar++);
        // Ensure the folder exists using boxID
        const uploadDir = path.join(__dirname, '..', 'uploads', username, boxID.toString());
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        console.log("gotThisFar", gotThisFar++);

        // Move the file to the correct directory (using boxID) 
        const filePath = path.join(uploadDir, file.originalname);
        fs.renameSync(file.path, filePath);
        console.log("gotThisFar", gotThisFar++);

        // Insert the media into the database
        await TimeToMove.insertMediaIntoBox(boxID.toString(), mediaPath, path.extname(file.originalname).slice(1));
        console.log("gotThisFar", gotThisFar++); 

        // Redirect back to the box page after upload
        res.redirect(`/${username}/${boxName}`);
    } catch (err) {
        console.error('Error during file upload:', err);
        return res.render('TimeToMove/boxContents', {
            errorMessage: 'Error uploading file',
            user: req.session.user,
            box: null,
            contents: [],
            session: req.session
        });
    }
});








router.get('/:username/:boxID/downloadAll', async (req, res) => {
    const { username, boxID } = req.params;
    try {
        
        // Fetch the user and box
        const user = await TimeToMove.getUserByUsername(username);
        console.log('UserAAAAAAAAAAAAAAAAAAAAAA:', user);
        console.log("req.session", req.session)
        if (!user) {
            return res.render('TimeToMove/boxContents', {
                errorMessage: 'User not found',
                user: req.session.user,
                box: null, 
                contents: [],
                session: req.session
            });
        }
        console.log('boxID IN DOWNLOADALL:', boxID);
        console.log('user.ID IN DOWNLOADALL:', user.ID);
        const box = await TimeToMove.getBoxByID(user.ID, boxID);
        console.log('boxxxxxxxxxxxxxxxxxxxxxx:', box);

        if (!box) {
            return res.render('TimeToMove/boxContents', {
                errorMessage: 'Box not found',
                user,
                box: null, // Pass null when box is not found
                contents: [],
                session: req.session
            });
        }

        // Fetch the files associated with the box
        // console.log("box.BoxID", box.BoxID);
        // console.log("box", box);
        // console.log("box.000BoxID", box[0].BoxID);
        const boxContents = await TimeToMove.getBoxContents(boxID);
        console.log('boxContentsHEREEEESADASD:', boxContents);
        if (!boxContents || boxContents.length === 0) {
            return res.render('TimeToMove/boxContents', {
                errorMessage: 'No files found in the box',
                user,
                box: null, 
                contents: [],
                session: req.session
            });
        }
        // get TitleChosen for the zip file
        console.log("THIS IS GONAN FUCK UP FOR USRE")
        const boxName = box[0].TitleChosen;
        console.log("BOX NAME HERE DOWNLOAD ALL", boxName)
        // Set up ZIP archive response
        res.setHeader('Content-Disposition', `attachment; filename=${username}_${boxName}.zip`);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level
        });
        console.log("got this far123")
        
        archive.pipe(res);
        console.log("got this far123")

        // Append files from the database to the ZIP archive
        for (const content of boxContents) {
            const filePath = path.join(__dirname, '..', 'uploads', content.MediaPath);

            // Check if the file exists before appending
            if (fs.existsSync(filePath)) {
                archive.file(filePath, { name: path.basename(filePath) });
            } else {
                console.error(`File not found: ${filePath}`);
            }
        }
        console.log("got this far123")

        // Finalize the ZIP file
        await archive.finalize();
    } catch (err) {
        console.error('Error creating ZIP for box:', err);
        return res.render('TimeToMove/boxContents', {
            errorMessage: 'Error creating ZIP file',
            user: req.session.user,
            box: null, 
            contents: [],
            session: req.session
        });
    }
});

router.post('/:username/:boxID/rename', async (req, res) => {
    const { username, boxID } = req.params;
    const { newBoxName, oldBoxName } = req.body; // Ensure oldBoxName is passed

    try {
        if (req.session.user && req.session.user.username === username) {
            const result = await TimeToMove.renameBox(boxID, newBoxName, oldBoxName, username);

            if (result.success) {
                res.redirect(`/${username}`);
            } else {
                res.status(400).send(result.message);
            }
        } else {
            res.status(403).send('You do not have permission to rename this box.');
        }
    } catch (err) {
        console.error('Error processing box rename:', err);
        res.status(500).send('Error renaming the box.');
    }
});

router.post('/:username/:boxID/delete', async (req, res) => {
    const { username, boxID } = req.params;

    try {
        // Fetch the user
        const user = await TimeToMove.getUserByUsername(username);
        console.log('DELsssETE ROUTE User:', user);
        console.log('DELEsssTE ROUTE boxID:', boxID);
        console.log('DELEsssTE ROUTE username:', username);
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Fetch the box and ensure it belongs to the user
        const box = await TimeToMove.getBoxByIDONLY(boxID);
        console.log('DELEsssTE ROUTE box:', box);
        if (!box || box.UserID !== user.ID) {
            return res.status(404).send('Box not found or unauthorized');
        }

        // Delete the media files from the file system and the database
        await TimeToMove.deleteBoxWithContents(boxID);

        // Redirect to the profile page after deletion
        res.redirect(`/${username}`);
    } catch (err) {
        console.error('Error deleting box:', err);
        res.status(500).send('Error deleting box');
    }
});



router.post('/:username/:boxName/:mediaID/delete', async (req, res) => {
    const { username, boxName, mediaID } = req.params;

    try {
        // Check if the logged-in user is the owner of the box
        if (req.session.user && req.session.user.username === username) {
            // Delete the file from the database and the file system
            await TimeToMove.deleteMedia(mediaID);
            res.redirect(`/${username}/${boxName}`);
        } else {
            res.status(403).send('Access Denied');
        }
    } catch (err) {
        console.error('Error deleting file:', err);
        res.status(500).send('Error deleting file.');
    }
});




module.exports = router;
