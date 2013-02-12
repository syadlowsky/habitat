module.exports = function(app, Hack, User, ensureAuthenticated, forceAbsolute, shuffle){

function project_filter(req, res, page, searchstr) {
  page = page - 1;
  /* Return many objects that correspond to the given page and query. */
  var query = Hack.find({});
  if (searchstr.length > 0) {
    var constraints = [];
    var terms = searchstr.split(' ');
    terms.forEach(function(term) {
      var termrx = new RegExp(term, "i");
      constraints.push({'title': { $regex: termrx}});
      constraints.push({'blurb': { $regex: termrx}});
    });
    constraints.push({'tags': { $in: terms }});
    query.or(constraints);
  }

  query.skip(page * 24);
  query.limit(24);

  query.exec(function(err, docs) {
    res.render('hacks', {
      title: 'Hacks',
      lastPage: docs.length < 24,
      page: page+1,
      user: req.user,
      hacks: shuffle(docs),
    });
  });
};

app.get('/projects', function(req, res) {
  project_filter(req, res, 1, "");
});

app.get('/projects/filter', function(req, res) {
  project_filter(req, res, req.query.page || 1, req.query.q || "");
});

app.get('/projects/:id', function(req, res) {
	Hack.findOne({
		"hackid": req.params.id,
	}, function(err, doc) {
		var team = {};

		for (var i=0; i<doc.team.length; i++) {
			if(doc.team[i]) {
				team[doc.team[i]] = {
					name: doc.team[i],
					avatarUrl: "https://s3.amazonaws.com/hackerfair/default-photo.jpg"
				};
			}
		}

		User.where('github.username').in(doc.team).exec(function(err, docs) {
			for (var i=0; i<docs.length; i++) {
				team[docs[i].github.username] = {
					name: docs[i].info.name || docs[i].github.name || docs[i].github.username,
					avatarUrl: docs[i].github.avatarUrl,
				};
			}
			res.render('hack', {
				title: doc.title,
				user: req.user,
				hack: doc,
				team: team,
        names: doc.names
			});
		});
	});
});

app.get('/projects/:id/edit', ensureAuthenticated('/login'), function(req, res) {
  Hack.findOne({
    "hackid": req.params.id,
  }, function(err, doc) {
    if (doc.owners.indexOf(req.user._id) < 0) {
      res.redirect('/projects/'+req.params.id);
    }
    else {
      User.where('_id').in(doc.owners).exec(function(err, docs) {
        res.render('edit_hack', {
          title: doc.title,
          user: req.user,
          hack: doc,
          owners: docs.map(function(owner) {
            return owner.github.username;
          }),
        });
      });
    }
  });
});

app.post('/projects/:id', ensureAuthenticated('/login'), function(req, res) {
  Hack.findOne({
    "hackid": req.params.id,
  }, function(err, doc) {
    if (doc.owners.indexOf(req.user._id) < 0) {
      res.redirect('/projects/'+req.params.id);
    } else {
      doc.title = req.body.title;
      doc.source = forceAbsolute(req.body.source);
      doc.team = req.body.team.split(/[,\/ ]+/);
      User.where('github.username').in(req.body.owners.split(/[,\/ ]+/)).exec(function(e, users) {
        if (e || !users) {
          console.log("Error occured: "+e);
        } else {
          doc.owners = users.map(function (user) {
            return mongoose.Types.ObjectId(""+user._id);
          });
          doc.demo = forceAbsolute(req.body.demo);
          doc.video = forceAbsolute(req.body.video);
          doc.picture = forceAbsolute(req.body.picture);
          doc.blurb = req.body.blurb;
          doc.tags = req.body.tags.toLowerCase().split(',').map(stripSpaces);
          doc.comments = req.body.comments;
          doc.save(function(er, d) {
            if (er) {
              console.log(er);
            } else {
              res.redirect('/projects/'+doc.hackid);
            }
          });
        }
      });
    }
  });
});

}
