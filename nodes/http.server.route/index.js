module.exports = function(FLUX) {

	function constr(NODE) {

		let serverIn = NODE.addInput('server', {
			type: "http.server"
		});

    let dataIn = NODE.addInput('dataa', {
      type: "string"
    });

    NODE.on('init', (state) => {

      NODE.getValuesFromInput(serverIn, state).then((servers) => {

        servers.forEach((server) => {

          server[NODE.data.type](NODE.data.path, (req, res) => {

            NODE.getValuesFromInput(dataIn, state).then((datas) => {
              res.send(datas.join(""));
            });

          });

        });

      });

    });

	}

	FLUX.addNode('http.server.route', {
		type: "object",
		level: 0,
		groups: ["http"]
	}, constr);

};
