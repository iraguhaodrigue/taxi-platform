import React, { useEffect, useRef } from "react";
import { WebView } from "react-native-webview";

// A Leaflet + OpenStreetMap map rendered inside a WebView. This avoids
// react-native-maps, which defaults to the Google provider on Android and
// crashes natively without an API key. We only ever used OSM tiles anyway.
//
// Props:
//   center        {lat, lng}                       initial center
//   markers       [{ id?, lat, lng, color, title }]
//   route         [[lat,lng], ...]                 optional blue polyline
//   follow        {lat, lng}                        pan here on update (ignored when a route is shown)
//   tappable      boolean                           emit onPress when the user taps the map
//   onPress       (lat, lng) => void
//   onMarkerPress (id) => void                      tapping a marker with an id
//   style         WebView style

const HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; }
  #map { background: #e8e8e8; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var map, markerLayer, routeLine, didFit = false, lastFitKey = '';
  var KIGALI = { lat: -1.9441, lng: 30.0619 };

  function icon(color){
    return L.divIcon({
      className: '',
      html: '<div style="background:' + (color || '#2a7') + ';width:18px;height:18px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 3px rgba(0,0,0,.5)"></div>',
      iconSize: [18, 18], iconAnchor: [9, 9]
    });
  }
  function post(obj){
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(obj));
  }
  function num(n){ return typeof n === 'number' && isFinite(n); }

  function init(center){
    var c = (center && num(center.lat) && num(center.lng)) ? center : KIGALI;
    map = L.map('map', { zoomControl: true, attributionControl: false }).setView([c.lat, c.lng], 14);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    markerLayer = L.layerGroup().addTo(map);
    map.on('click', function(e){ post({ type: 'press', lat: e.latlng.lat, lng: e.latlng.lng }); });
    post({ type: 'ready' });
  }

  function routeKey(route){
    if (!route || !route.length) return '';
    return route.length + ':' + route[0].join(',') + ':' + route[route.length - 1].join(',');
  }

  window.__render = function(payload){
    try {
      var data = (typeof payload === 'string') ? JSON.parse(payload) : payload;
      if (!map) init(data.center);

      markerLayer.clearLayers();
      var pts = [];
      (data.markers || []).forEach(function(m){
        if (!num(m.lat) || !num(m.lng)) return;
        var mk = L.marker([m.lat, m.lng], { icon: icon(m.color) }).addTo(markerLayer).bindPopup(m.title || '');
        if (m.id !== undefined && m.id !== null) {
          mk.on('click', function(){ post({ type: 'marker', id: m.id }); });
        }
        pts.push([m.lat, m.lng]);
      });

      // Route polyline
      if (routeLine) { routeLine.remove(); routeLine = null; }
      var route = (data.route && data.route.length > 1) ? data.route : null;
      if (route) {
        routeLine = L.polyline(route, { color: '#1E6FFF', weight: 5, opacity: 0.85 }).addTo(map);
      }

      if (route) {
        // Fit to the whole line + markers whenever the route changes.
        var key = routeKey(route) + '|' + pts.length;
        if (key !== lastFitKey) {
          lastFitKey = key;
          var all = route.concat(pts);
          map.fitBounds(all, { padding: [40, 40] });
        }
      } else {
        if (!didFit && pts.length > 0) {
          didFit = true;
          if (pts.length === 1) map.setView(pts[0], 14);
          else map.fitBounds(pts, { padding: [40, 40] });
        }
        var f = data.follow;
        if (f && num(f.lat) && num(f.lng)) map.panTo([f.lat, f.lng]);
      }
    } catch (err) {
      post({ type: 'error', message: String(err) });
    }
  };
</script>
</body>
</html>`;

export default function OsmMap({
  center, markers = [], route, follow, tappable = false, onPress, onMarkerPress, style,
}) {
  const ref = useRef(null);
  const loadedRef = useRef(false);
  const payload = { center, markers, route, follow };
  const payloadStr = JSON.stringify(payload);

  function push() {
    if (!ref.current || !loadedRef.current) return;
    ref.current.injectJavaScript(
      "window.__render && window.__render(" + payloadStr + "); true;"
    );
  }

  useEffect(() => { push(); }, [payloadStr]);

  return (
    <WebView
      ref={ref}
      style={style}
      originWhitelist={["*"]}
      source={{ html: HTML }}
      javaScriptEnabled
      domStorageEnabled
      onLoadEnd={() => { loadedRef.current = true; push(); }}
      onMessage={(e) => {
        try {
          const data = JSON.parse(e.nativeEvent.data);
          if (data.type === "press" && tappable && onPress) onPress(data.lat, data.lng);
          else if (data.type === "marker" && onMarkerPress) onMarkerPress(data.id);
        } catch {
          // ignore non-JSON messages
        }
      }}
    />
  );
}
