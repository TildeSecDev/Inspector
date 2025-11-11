const mongoose = require('mongoose');

const workshope = new mongoose.Schema({

    workshopUrl: {
        type : string,
        require : true
        }
});