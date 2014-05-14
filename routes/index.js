exports.index = function (req, res) {
	var usr;

	if(req.user)
	{
		usr = req.user.username;
		req.session.usr = usr;
	}

	res.render('index', {user: usr});
}

exports.login = function (req, res) {

    res.render('login');
}

exports.authorized = function (req, res) {
	var usr = req.user.username;
	console.log(usr);
	res.render('authorized', {user: usr});
}