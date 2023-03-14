const Photo = require('../models/photo.model');
const Voter = require('../models/voter.model');
const requestIp = require('request-ip');

/****** SUBMIT PHOTO ********/

exports.add = async (req, res) => {

  try {
    const { title, author, email } = req.fields;
    const file = req.files.file;

    if (title && author && email && file) { // if fields are not empty...

      const fileName = file.path.split('/').slice(-1)[0]; // cut only filename from full path, e.g. C:/test/abc.jpg -> abc.jpg
      const extension = fileName.split('.').slice(-1)[0]; // get the extension of the file
      
      if (extension !== 'gif' && extension !== 'jpg' && extension !== 'png') { // check if the file extension is valid
        throw new Error('Invalid file format!');
      }

      if (title.length > 25 || author.length > 50) {
        throw new Error('Title max length is 25, author max length is 50');
      }
      
      // check email format
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format!');
      }
      
      const newPhoto = new Photo({ title, author, email, src: fileName, votes: 0 });
      await newPhoto.save(); // ...save new photo in DB
      res.json(newPhoto);

    } else {
      throw new Error('Wrong input!');
    }

  } catch (err) {
    res.status(500).json(err);
  }

};

/****** LOAD ALL PHOTOS ********/

exports.loadAll = async (req, res) => {

  try {
    res.json(await Photo.find());
  } catch (err) {
    res.status(500).json(err);
  }

};

/****** VOTE FOR PHOTO ********/

exports.vote = async (req, res) => {
  const ipAddress = requestIp.getClientIp(req);
  const photoId = req.params.id;
  
  try {
    const photo = await Photo.findOne({ _id: photoId });
    if (!photo) {
      return res.status(404).json({ message: 'Not found' });
    }

    let voter = await Voter.findOne({ user: ipAddress });
    if (!voter) {
      // If this is the first time this user is voting, create a new Voter document
      voter = new Voter({ user: ipAddress, votes: [photoId] });
    } else if (voter.votes.includes(photoId)) {
      // If this user has already voted for this photo, return an error
      return res.status(500).json({ message: 'Already voted for this photo' });
    } else {
      // Add the photo ID to this user's votes and save the updated Voter document
      voter.votes.push(photoId);
    }

    // Increment the photo's votes and save it
    photo.votes++;
    await photo.save();

    // Save the updated Voter document
    await voter.save();

    res.json(photo);
  } catch (err) {
    res.status(500).json(err);
  }
};