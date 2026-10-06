from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["tracking"])


class TripConnections:
    """Keeps the live connections for each booking (trip).

    For one booking, the driver sends location and the passenger listens.
    This is an in-memory version, good for development and testing.
    For production with many servers, Claude Code can move this to
    Redis Pub/Sub or Supabase Realtime (see backend/README.md).
    """
    def __init__(self):
        self.rooms: dict[int, list[WebSocket]] = {}

    async def join(self, booking_id: int, ws: WebSocket):
        await ws.accept()
        self.rooms.setdefault(booking_id, []).append(ws)

    def leave(self, booking_id: int, ws: WebSocket):
        if booking_id in self.rooms and ws in self.rooms[booking_id]:
            self.rooms[booking_id].remove(ws)

    async def broadcast(self, booking_id: int, message: dict):
        for conn in self.rooms.get(booking_id, []):
            await conn.send_json(message)


manager = TripConnections()


@router.websocket("/ws/track/{booking_id}")
async def track(websocket: WebSocket, booking_id: int):
    """Live location channel for one trip.

    Driver app sends:    {"lat": -1.95, "lng": 30.06}
    Passenger app gets:  the same message, in real time.
    """
    await manager.join(booking_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()  # driver's new location
            await manager.broadcast(booking_id, data)  # send to passenger
    except WebSocketDisconnect:
        manager.leave(booking_id, websocket)
