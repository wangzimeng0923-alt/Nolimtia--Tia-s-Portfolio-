(() => {
  const world = document.querySelector("[data-gate-world]");
  const canvas = world?.querySelector("[data-globe-canvas]");
  const hitSurface = world?.querySelector("[data-globe-hit]");
  const geography = window.TIA_GLOBE_GEOGRAPHY;
  if (!world || !canvas || !hitSurface || !window.d3 || !geography) return;

  const context = canvas.getContext("2d");
  if (!context) return;

  const size = 1200;
  const radius = 500;
  const center = [600, 590];
  const pitchMin = -55;
  const pitchMax = 15;
  const dragSensitivity = 0.13;
  const follow = 7;
  const friction = 1.5;
  const maxVelocity = 70;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const palette = getComputedStyle(document.documentElement);
  const color = (name) => palette.getPropertyValue(name).trim();

  const projection = d3.geoOrthographic()
    .clipAngle(90)
    .precision(0.4)
    .translate(center)
    .scale(radius);
  const canvasPath = d3.geoPath(projection, context);
  const svgPath = d3.geoPath(projection);
  const graticule = d3.geoGraticule10();
  const sphere = { type: "Sphere" };
  const current = { lon: reducedMotion ? 76 : 72, lat: -22 };
  const target = { lon: 76, lat: -22 };
  const velocity = { x: 0, y: 0 };
  const routeSpecs = [
    {
      selector: ".gate-route-work",
      coordinates: [[-9.1, 38.7], [-45, 34], [-72, 26], [-80.2, 25.7], [-87, 25], [-94, 24.5]],
      markers: [[-9.1, 38.7], [-94, 24.5]],
      labelAnchor: [-9.1, 38.7],
      labelOffset: [82, 270],
    },
    {
      selector: ".gate-route-story",
      coordinates: [[-79.5, 8.9], [-90.5, -0.6], [-109.4, -27.1]],
      markers: [[-79.5, 8.9], [-109.4, -27.1]],
      labelAnchor: [-109.4, -27.1],
      labelOffset: [-249, 87],
    },
  ];
  const routes = routeSpecs.map((spec) => {
    const element = world.querySelector(spec.selector);
    return {
      ...spec,
      element,
      hit: element?.querySelector(".gate-route-hit"),
      line: element?.querySelector(".gate-route-line"),
      points: [...(element?.querySelectorAll(".gate-route-point") || [])],
      label: element?.querySelector("text"),
    };
  });
  if (routes.some((route) => !route.element || !route.hit || !route.line || !route.label)) return;

  let dragging = false;
  let lastPointer = null;
  let hoverPointer = null;
  let lastFrame = 0;
  let drawnLon = Infinity;
  let drawnLat = Infinity;
  let needsDraw = true;
  let ready = false;

  function visible(coordinates) {
    return d3.geoDistance(coordinates, [-current.lon, -current.lat]) < Math.PI / 2;
  }

  function updateRoutes() {
    routes.forEach((route) => {
      const line = { type: "LineString", coordinates: route.coordinates };
      const pathData = svgPath(line) || "";
      route.hit.setAttribute("d", pathData);
      route.line.setAttribute("d", pathData);

      route.points.forEach((point, index) => {
        const coordinates = route.markers[index];
        const isVisible = coordinates && visible(coordinates);
        point.style.visibility = isVisible ? "visible" : "hidden";
        if (isVisible) {
          const [x, y] = projection(coordinates);
          point.setAttribute("cx", x.toFixed(2));
          point.setAttribute("cy", y.toFixed(2));
        }
      });

      const labelVisible = visible(route.labelAnchor);
      route.label.style.visibility = labelVisible ? "visible" : "hidden";
      if (labelVisible) {
        const [x, y] = projection(route.labelAnchor);
        route.label.setAttribute("x", clamp(x + route.labelOffset[0], 24, 1070).toFixed(2));
        route.label.setAttribute("y", clamp(y + route.labelOffset[1], 70, 1110).toFixed(2));
      }
    });
  }

  function draw() {
    projection.rotate([current.lon, current.lat, -8]);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, size, size);

    const ocean = context.createRadialGradient(480, 440, 0, 600, 590, 525);
    ocean.addColorStop(0, color("--globe-ocean-light"));
    ocean.addColorStop(0.7, color("--globe-ocean-mid"));
    ocean.addColorStop(1, color("--globe-ocean-deep"));
    context.beginPath();
    canvasPath(sphere);
    context.fillStyle = ocean;
    context.fill();

    context.save();
    context.beginPath();
    canvasPath(sphere);
    context.clip();

    context.beginPath();
    canvasPath(graticule);
    context.strokeStyle = "rgba(255, 252, 247, 0.32)";
    context.lineWidth = 1;
    context.stroke();

    const land = context.createLinearGradient(100, 90, 1100, 1090);
    land.addColorStop(0, color("--globe-land-light"));
    land.addColorStop(0.55, color("--globe-land-mid"));
    land.addColorStop(1, color("--globe-land-deep"));
    context.beginPath();
    canvasPath(geography.LAND);
    context.fillStyle = land;
    context.fill();
    context.strokeStyle = color("--color-text");
    context.lineWidth = 2;
    context.lineJoin = "round";
    context.stroke();

    context.beginPath();
    canvasPath(geography.LAKES);
    context.fillStyle = color("--globe-ocean-mid");
    context.fill();
    context.lineWidth = 1.5;
    context.stroke();

    const shade = context.createRadialGradient(500, 450, 300, 600, 590, 500);
    shade.addColorStop(0, "rgba(12, 17, 19, 0)");
    shade.addColorStop(1, "rgba(12, 17, 19, 0.28)");
    context.fillStyle = shade;
    context.fillRect(100, 90, 1000, 1000);
    context.restore();

    context.beginPath();
    canvasPath(sphere);
    context.strokeStyle = color("--color-text");
    context.lineWidth = 3;
    context.stroke();
    updateRoutes();

    if (!ready) {
      ready = true;
      world.classList.add("has-interactive-globe");
    }
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    needsDraw = true;
  }

  function frame(time) {
    const dt = Math.min(0.05, (time - (lastFrame || time)) / 1000);
    lastFrame = time;
    if (!dragging && !reducedMotion) {
      const decay = Math.exp(-friction * dt);
      velocity.x *= decay;
      velocity.y *= decay;
      target.lon += velocity.x * dt;
      target.lat = clamp(target.lat + velocity.y * dt, pitchMin, pitchMax);
      if (target.lat === pitchMin || target.lat === pitchMax) velocity.y = 0;
      if (Math.abs(velocity.x) < 0.02) velocity.x = 0;
      if (Math.abs(velocity.y) < 0.02) velocity.y = 0;
    }

    const easing = reducedMotion ? 1 : 1 - Math.exp(-follow * dt);
    current.lon += (target.lon - current.lon) * easing;
    current.lat += (target.lat - current.lat) * easing;
    if (needsDraw || Math.abs(current.lon - drawnLon) > 0.001 || Math.abs(current.lat - drawnLat) > 0.001) {
      draw();
      drawnLon = current.lon;
      drawnLat = current.lat;
      needsDraw = false;
    }
    requestAnimationFrame(frame);
  }

  hitSurface.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    dragging = true;
    hoverPointer = null;
    lastPointer = { x: event.clientX, y: event.clientY, time: performance.now() };
    velocity.x = 0;
    velocity.y = 0;
    hitSurface.setPointerCapture(event.pointerId);
  });

  hitSurface.addEventListener("pointermove", (event) => {
    if (!dragging) {
      if (hoverPointer && !reducedMotion) {
        target.lon += clamp(event.clientX - hoverPointer.x, -50, 50) * 0.015;
        target.lat = clamp(target.lat - clamp(event.clientY - hoverPointer.y, -50, 50) * 0.008, pitchMin, pitchMax);
      }
      hoverPointer = { x: event.clientX, y: event.clientY };
      return;
    }

    const now = performance.now();
    const dt = Math.max(1, now - lastPointer.time) / 1000;
    const dx = (event.clientX - lastPointer.x) * dragSensitivity;
    const dy = (event.clientY - lastPointer.y) * dragSensitivity;
    target.lon += dx;
    target.lat = clamp(target.lat - dy, pitchMin, pitchMax);
    velocity.x = clamp(0.6 * velocity.x + 0.4 * dx / dt, -maxVelocity, maxVelocity);
    velocity.y = clamp(0.6 * velocity.y + 0.4 * -dy / dt, -maxVelocity, maxVelocity);
    lastPointer = { x: event.clientX, y: event.clientY, time: now };
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    if (reducedMotion || performance.now() - lastPointer.time > 80) {
      velocity.x = 0;
      velocity.y = 0;
    }
  }

  hitSurface.addEventListener("pointerup", endDrag);
  hitSurface.addEventListener("pointercancel", endDrag);
  hitSurface.addEventListener("lostpointercapture", endDrag);
  hitSurface.addEventListener("pointerleave", () => { hoverPointer = null; });
  routes.forEach((route) => {
    const pause = () => {
      velocity.x = 0;
      velocity.y = 0;
      target.lon = current.lon;
      target.lat = current.lat;
    };
    route.element.addEventListener("pointerenter", pause);
    route.element.addEventListener("focus", pause);
  });

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);
})();
