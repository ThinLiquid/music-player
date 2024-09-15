(() => {
  const scriptElement = document.currentScript || document.createElement('script');
  if (!scriptElement.parentElement) document.body.appendChild(scriptElement);

  const parentElement = scriptElement.parentElement || document.body;
  let index = 0;

  const data = (() => {
    try {
      return eval(scriptElement.innerHTML);
    } catch (e) {
      return {};
    }
  })() || {};

  const audio = new Audio();
  parentElement.appendChild(audio);

  const elements = {
    metadata: parentElement.querySelector('.lqd-metadata') || document.createElement('div'),
    toggleSongs: parentElement.querySelector('.lqd-toggle-songs') || document.createElement('button'),
    play: parentElement.querySelector('.lqd-play') || document.createElement('button'),
    stop: parentElement.querySelector('.lqd-stop') || document.createElement('button'),
    next: parentElement.querySelector('.lqd-next') || document.createElement('button'),
    prev: parentElement.querySelector('.lqd-prev') || document.createElement('button'),
    time: parentElement.querySelector('.lqd-time') || document.createElement('div'),
    visualizer: parentElement.querySelector('.lqd-visualizer') || document.createElement('canvas'),
    progress: parentElement.querySelector('.lqd-seek') || document.createElement('div'),
    innerProgress: parentElement.querySelector('.lqd-seek-inner') || document.createElement('div'),
    volume: parentElement.querySelector('.lqd-volume') || document.createElement('div'),
    innerVolume: parentElement.querySelector('.lqd-volume-inner') || document.createElement('div'),
    songsContainer: parentElement.querySelector('.lqd-songs') || document.createElement('div')
  };

  const handleSongChange = async (_index, shouldStart = true) => {
    if (_index < 0) index = data.songs.length - 1;
    if (_index >= data.songs.length) index = 0;

    const song = data.songs[index];
    audio.src = song.url;

    const metadataSpans = elements.metadata.querySelectorAll('div > span');
    metadataSpans[0].innerText = `${song.artist} - ${song.title}`;

    if (elements.metadata.scrollWidth > elements.metadata.clientWidth) {
      metadataSpans[1].innerText = `${song.artist} - ${song.title}`;
      elements.metadata.classList.add('overflow');
    } else {
      elements.metadata.classList.remove('overflow');
      metadataSpans[1].innerText = '';
    }

    try {
      if (shouldStart) await audio.play();
    } catch (e) {
      audio.pause();
    }
  };

  const setupEventListeners = () => {
    elements.play.addEventListener('click', () => {
      audio[audio.paused ? 'play' : 'pause']();
    });

    elements.stop.addEventListener('click', () => {
      audio.pause();
      audio.currentTime = 0;
    });

    elements.next.addEventListener('click', () => {
      index++;
      handleSongChange(index);
    });

    elements.prev.addEventListener('click', () => {
      index--;
      handleSongChange(index);
    });

    elements.toggleSongs.addEventListener('click', () => {
      elements.songsContainer.classList.toggle('active');
    });

    elements.progress.addEventListener('mousedown', (e) => {
      const onMouseMove = (e) => {
        const { left, width } = elements.progress.getBoundingClientRect();
        const seek = Math.max(0, Math.min(1, (e.clientX - left) / width));
        audio.currentTime = seek * audio.duration;
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('blur', onMouseUp);
        document.removeEventListener('mouseleave', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      window.addEventListener('blur', onMouseUp);
      document.addEventListener('mouseleave', onMouseUp);

      onMouseMove(e);
    });

    elements.volume.addEventListener('mousedown', (e) => {
      const onMouseMove = (e) => {
        const { top, height } = elements.volume.getBoundingClientRect();
        const seek = Math.max(0, Math.min(1, (e.clientY - top) / height * -1 + 1));
        audio.volume = seek;
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('blur', onMouseUp);
        document.removeEventListener('mouseleave', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      window.addEventListener('blur', onMouseUp);
      document.addEventListener('mouseleave', onMouseUp);

      onMouseMove(e);
    });

    audio.addEventListener('timeupdate', () => {
      elements.innerProgress.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
      elements.time.innerText = `${new Date(audio.currentTime * 1000).toISOString().substr(14, 5)} / ${new Date(audio.duration * 1000).toISOString().substr(14, 5)}`;
    });

    audio.addEventListener('volumechange', () => {
      elements.innerVolume.style.bottom = `${audio.volume * 100 - 2}%`;
    });

    audio.addEventListener('ended', () => {
      index++;
      handleSongChange(index);
    });
  };

  const setupSongs = () => {
    console.log(data.songs);
    data.songs.forEach((song) => {
      const songElement = document.createElement('div');
      songElement.innerText = `${song.artist} - ${song.title}`;
      songElement.addEventListener('click', () => {
        index = data.songs.indexOf(song);
        handleSongChange(index);
      });
      elements.songsContainer.appendChild(songElement);
    });
  };

  const setupVisualizer = async () => {
    const audioCtx = data.audioContext || new AudioContext();

    const enableAudio = async () => {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
        window.removeEventListener('click', enableAudio);
      }
    }
    window.addEventListener('click', enableAudio);

    const source = audioCtx.createMediaElementSource(audio);
    const analyser = audioCtx.createAnalyser();
    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    analyser.fftSize = 128;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);


    let visualizer;
    if (data.canvasMode === 'milkdrop') {
      const { default: butterchurn } = await import('https://esm.sh/butterchurn');
      const { default: butterchurnPresets } = await import('https://esm.sh/butterchurn-presets');
    
      visualizer = butterchurn.createVisualizer(audioCtx, elements.visualizer, {
        width: elements.visualizer.width,
        height: elements.visualizer.height,
      });
  
      visualizer.connectAudio(source);
  
      const presets = butterchurnPresets.getPresets();
      presetKeys = Object.keys(presets);

      if (data.canvasPreset === 'random') {
        const overlay = document.createElement('overlay')
        overlay.style.position = 'absolute';
        overlay.style.top = 0;
        overlay.style.left = '15px';
        overlay.style.fontSize = '7.5px';
        overlay.style.color = 'white';

        if (data.canvasShowName === true) {
          elements.visualizer.parentElement.appendChild(overlay);
        }
        const loadRandomPreset = () => {
          const name = presetKeys[Math.floor(Math.random() * presetKeys.length)];
          overlay.innerText = name;
          visualizer.loadPreset(presets[name], data.canvasPresetTransitionDuration || 10);
        };
        const name = presetKeys[Math.floor(Math.random() * presetKeys.length)];
        overlay.innerText = name;
        visualizer.loadPreset(presets[name], 0);
    
        setInterval(loadRandomPreset, (data.canvasPresetDuration || 10) * 1000);
      } else if (data.canvasPreset) {
        visualizer.loadPreset(presets[data.canvasPreset], 2);
      }
    }

    const renderFrame = () => {
      if (data.canvasMode === 'bar' || !data.canvasMode) {
        barVisualizer(dataArray, analyser, bufferLength);
      } else if (data.canvasMode === 'wave') {
        waveVisualizer(dataArray, analyser, bufferLength);
      } else if (data.canvasMode === 'milkdrop' && !audio.paused) {
        visualizer.render();
      }
      requestAnimationFrame(renderFrame);
    };

    renderFrame();
  };

  const barVisualizer = (dataArray, analyser, bufferLength) => {
    const ctx = elements.visualizer.getContext('2d');
    if (!ctx) return;

    analyser.getByteFrequencyData(dataArray);
    ctx.clearRect(0, 0, elements.visualizer.width, elements.visualizer.height);

    const barWidth = (elements.visualizer.width / bufferLength) * 2.5;
    let x = 0;

    dataArray.forEach((item) => {
      const barHeight = item / 2;
      if (data.canvasColorStyle === 'gradient') {
        const gradient = ctx.createLinearGradient(0, 0, elements.visualizer.width, 0);
        for (let i = 0; i < data.canvasColor.length; i++) {
          const stop = i / data.canvasColor.length;
          gradient.addColorStop(stop, data.canvasColor[i]);
        }
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = getColorStyle(barHeight);
      }
      ctx.fillRect(x, elements.visualizer.height - barHeight / 2 + 10, barWidth, barHeight / 2 - 10);
      x += barWidth + 1;
    });
  };

  const waveVisualizer = (dataArray, analyser, bufferLength) => {
    const ctx = elements.visualizer.getContext('2d');
    if (!ctx) return;

    analyser.getByteTimeDomainData(dataArray);
    ctx.clearRect(0, 0, elements.visualizer.width, elements.visualizer.height);
    ctx.lineWidth = 4;
    if (data.canvasColorStyle === 'gradient') {
      const gradient = ctx.createLinearGradient(0, 0, elements.visualizer.width, 0);
      for (let i = 0; i < data.canvasColor.length; i++) {
        const stop = i / data.canvasColor.length;
        gradient.addColorStop(stop, data.canvasColor[i]);
      }
      ctx.strokeStyle = gradient;
    } else if (data.canvasColorStyle === 'volume') {
      const gradient = ctx.createLinearGradient(0, 0, elements.visualizer.width, 0);
      for (let i = 0; i < bufferLength; i++) {
        const normalizedHeight = dataArray[i] / 128;
        const hue = (normalizedHeight / 2) * 120;
        gradient.addColorStop(i / bufferLength, `hsl(${hue}, 100%, 50%)`);
      }
      ctx.strokeStyle = gradient;
    } else {
      ctx.strokeStyle = getColorStyle();
    }

    ctx.beginPath();
    const sliceWidth = elements.visualizer.width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = v * elements.visualizer.height / 2;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    ctx.stroke();
  };

  const getColorStyle = (barHeight) => {
    if (data.canvasColorStyle === 'volume') {
      const normalizedHeight = barHeight / elements.visualizer.height;
      const hue = (1 - normalizedHeight / 2) * 120;
      return `hsl(${hue}, 100%, 50%)`;
    } else if (data.canvasColorStyle === 'custom') {
      return data.canvasColor || 'white';
    }
  };

  setupEventListeners();
  setupSongs();
  setupVisualizer();
  handleSongChange(0, data.autoplay ?? false);
})();