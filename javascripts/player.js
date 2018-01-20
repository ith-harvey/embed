
gateways = [
  "https://ipfs.infura.io",
  "https://ipfs.io",
  "https://gateway.ipfs.io",
  "https://scrappy.i.ipfs.io",
  "https://chappy.i.ipfs.io"
]
player = null
itLoaded = false
steem.api.setOptions({
  url: 'https://api.steemit.com'
});
var path = window.location.href.split("#!/")[1];
var autoplay = (path.split("/")[2] == 'true')
var nobranding = (path.split("/")[3] == 'true')
var videoGateway = path.split("/")[4]
var snapGateway = path.split("/")[5]

steem.api.getContent(path.split("/")[0], path.split("/")[1], function (err, b) {
  if (err) {
    console.log(err)
    return
  }
  var a = JSON.parse(b.json_metadata).video;

  var qualities = generateQualities(a, videoGateway)
  createPlayer(canonicalUrl(a.info.snaphash), autoplay, nobranding, qualities, a.info.spritehash, a.info.duration)

  // trying to find something that answers faster than the canonical gateway
  if (!videoGateway)
    findBestUrl(qualities[0].hash, function (url) {
      for (let i = 0; i < qualities.length; i++) {
        if (qualities[i].label !== qualities[0].label) break
        qualities[i].src = url
      }
      player.updateSrc(qualities)
    })

  // DISABLED
  // if there's a magnet link, start torrent in background
  // if (a.content.magnet) {
  //   var Torrent = new WebTorrent()
  //   Torrent.add(a.content.magnet, function (torrent) {
  //     // and switch when torrent is ready  and downloading at fair speed!
  //     torrent.on('download', function (bytes) {
  //       if (!itLoaded && torrent.downloadSpeed > a.info.filesize / a.info.duration) {
  //         itLoaded = true
  //         var file = torrent.files[0]
  //         var container = document.getElementsByTagName('video')[0]
  //         file.renderTo(container)
  //       }
  //     })
  //   })
  // }
});

function createPlayer(posterUrl, autoplay, branding, qualities, sprite, duration) {
  var c = document.createElement("video");
  c.poster = posterUrl;
  c.controls = true;
  c.autoplay = autoplay;
  c.id = "player";
  c.className = "video-js";
  c.style = "width:100%;height:100%";
  c.addEventListener('loadeddata', function () {
    if (c.readyState >= 3) {
      itLoaded = true
    }
  });
  document.body.appendChild(c);
  player = videojs("player", {
    inactivityTimeout: 1000,
    sourceOrder: true,
    sources: qualities,
    techOrder: ["html5"],
    'playbackRates': [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2],
    controlBar: {
      children: {
        'playToggle': {},
        'muteToggle': {},
        'volumeControl': {},
        'currentTimeDisplay': {},
        'timeDivider': {},
        'durationDisplay': {},
        'liveDisplay': {},
        'flexibleWidthSpacer': {},
        'progressControl': {},
        'settingsMenuButton': {
          entries: [
            'playbackRateMenuButton'
          ]
        },
        'fullscreenToggle': {}
      }
    },
    plugins: {
      persistvolume: {
        namespace: 'dtube'
      },
      videoJsResolutionSwitcher: {
        default: qualities[0].label
      }
    }
  })

  if (sprite) {
    var listThumbnails = {}
    var nFrames = 100
    if (duration < 100) nFrames = Math.floor(duration)
    for (let s = 0; s < nFrames; s++) {
      var nSeconds = s
      if (duration > 100) nSeconds = Math.floor(s*duration/100)
      listThumbnails[nSeconds] = {
        src: canonicalUrl(sprite),
        style: {
          margin: -118*s+'px 0px 0px 0px',
        }
      }
    }
    player.thumbnails(listThumbnails);
  }


  videojs('player').ready(function () {
    this.hotkeys({
      volumeStep: 0.05,
      seekStep: 5,
      enableModifiersForNumbers: false
    });

    window.onmessage = function(e){
      if (e.data.seekTo)
        player.currentTime(e.data.seekTime)
    }
  });

  player.brand({
    branding: !JSON.parse(nobranding),
    title: "Watch on DTube",
    destination: "http://d.tube/#!/v/" + path.split("/")[0] + '/' + path.split("/")[1],
    destinationTarget: "_blank"
  })
}

function removePlayer() {
  var elem = document.getElementById('player');
  return elem.parentNode.removeChild(elem);
}

function canonicalGateway(ipfsHash) {
  var g = ipfsHash.charCodeAt(ipfsHash.length - 1) % gateways.length
  return gateways[g].split('://')[1]
}

function canonicalUrl(ipfsHash) {
  return 'https://' + canonicalGateway(ipfsHash) + '/ipfs/' + ipfsHash
}

function findBestUrl(hash, cb) {
  let isFirst = true;
  gateways.forEach((gateway) => {
    const url = gateway + '/ipfs/' + hash
    const timeStart = new Date()
    const request = new XMLHttpRequest();
    request.open("HEAD", url, true);
    request.onerror = function (e) {
      console.log('Error: ' + url)
    }
    request.onreadystatechange = function () {
      if (request.readyState === request.HEADERS_RECEIVED) {
        if (request.status === 200) {
          const headers = request.getAllResponseHeaders()
          if (headers.includes("content-type: video") && isFirst) {
            isFirst = false
            cb(url)
          }
        }
      }
    }
    request.send();
  })
}

function generateQualities(a, videoGateway) {
  var qualities = []
  if (a.content.video480hash) {
    qualities.push({
      label: '480p',
      type: 'video/mp4',
      hash: a.content.video480hash,
      src: videoGateway ? videoGateway + '/ipfs/' + a.content.video480hash : canonicalUrl(a.content.video480hash)
    })
  }
  qualities.push({
    label: 'Source',
    type: 'video/mp4',
    hash: a.content.videohash,
    src: videoGateway ? videoGateway + '/ipfs/' + a.content.videohash : canonicalUrl(a.content.videohash)
  })
  return qualities
}
