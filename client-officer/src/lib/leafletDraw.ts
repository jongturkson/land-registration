import L from 'leaflet';
import 'leaflet-draw';

/**
 * Compatibility patch for leaflet-draw 1.0.4 on Leaflet 1.9+.
 *
 * Leaflet 1.9 reports `L.Browser.touch = true` on every pointer-events browser
 * (all modern desktops), so leaflet-draw binds its touch handler in addition
 * to the mouse handler. Each mouse click then adds TWO vertices at the same
 * spot — and because the duplicate lands on the click target, the polygon
 * tool interprets the 3rd click as "clicked an existing vertex" and finishes
 * the shape. Symptom: only triangles can be drawn.
 *
 * Fix: skip the synthetic touch path when the pointer is a mouse or pen.
 * Genuine touchscreen input (pointerType === 'touch' or a real TouchEvent)
 * still goes through the original handler.
 */
interface SyntheticTouchEvent {
  originalEvent?: PointerEvent | TouchEvent;
}

const polylineProto = L.Draw.Polyline.prototype as unknown as {
  _onTouch: (e: SyntheticTouchEvent) => void;
};

const originalOnTouch = polylineProto._onTouch;

polylineProto._onTouch = function (e: SyntheticTouchEvent) {
  const oe = e.originalEvent;
  if (oe && 'pointerType' in oe && (oe as PointerEvent).pointerType !== 'touch') {
    return; // mouse/pen click — the mouse handler already added this vertex
  }
  return originalOnTouch.call(this, e);
};
