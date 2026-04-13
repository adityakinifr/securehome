import Foundation

// MARK: - Device

struct Device: Codable, Identifiable {
    let id: String
    let name: String
    let deviceType: DeviceType
    let room: String
    let online: Bool
    let lockState: LockState
    let doorState: DoorState
    let openPercent: Double

    enum CodingKeys: String, CodingKey {
        case id, name, room, online
        case deviceType = "device_type"
        case lockState = "lock_state"
        case doorState = "door_state"
        case openPercent = "open_percent"
    }
}

enum DeviceType: String, Codable {
    case lock = "LOCK"
    case camera = "CAMERA"
    case doorbell = "DOORBELL"
    case thermostat = "THERMOSTAT"
    case light = "LIGHT"
    case sensor = "SENSOR"
    case door = "DOOR"
    case other = "OTHER"

    var icon: String {
        switch self {
        case .lock: return "lock.fill"
        case .camera: return "video.fill"
        case .doorbell: return "bell.fill"
        case .thermostat: return "thermometer.medium"
        case .light: return "lightbulb.fill"
        case .sensor: return "sensor.fill"
        case .door: return "door.left.hand.closed"
        case .other: return "square.grid.2x2"
        }
    }

    var label: String {
        switch self {
        case .lock: return "Lock"
        case .camera: return "Camera"
        case .doorbell: return "Doorbell"
        case .thermostat: return "Thermostat"
        case .light: return "Light"
        case .sensor: return "Sensor"
        case .door: return "Door"
        case .other: return "Device"
        }
    }
}

enum LockState: String, Codable {
    case locked = "LOCKED"
    case unlocked = "UNLOCKED"
    case jammed = "JAMMED"
    case unknown = "UNKNOWN"
}

enum DoorState: String, Codable {
    case open = "OPEN"
    case closed = "CLOSED"
    case unknown = "UNKNOWN"
}

// MARK: - Night Check

struct NightCheckResult: Codable {
    let checkedAt: String
    let allSecure: Bool
    let unlockedLocks: [Device]
    let openDoors: [Device]

    enum CodingKeys: String, CodingKey {
        case checkedAt = "checked_at"
        case allSecure = "all_secure"
        case unlockedLocks = "unlocked_locks"
        case openDoors = "open_doors"
    }
}

// MARK: - Visitor Summary

struct VisitorSummary: Codable {
    let date: String
    let totalPersonEvents: Int
    let totalDoorbellPresses: Int
    let totalMotionEvents: Int
    let events: [CameraEvent]

    enum CodingKeys: String, CodingKey {
        case date, events
        case totalPersonEvents = "total_person_events"
        case totalDoorbellPresses = "total_doorbell_presses"
        case totalMotionEvents = "total_motion_events"
    }
}

struct CameraEvent: Codable, Identifiable {
    let deviceId: String
    let deviceName: String
    let eventType: String
    let timestamp: String
    let eventId: String

    var id: String { "\(deviceId)-\(timestamp)-\(eventId)" }

    enum CodingKeys: String, CodingKey {
        case deviceId = "device_id"
        case deviceName = "device_name"
        case eventType = "event_type"
        case timestamp
        case eventId = "event_id"
    }
}

// MARK: - Lock History

struct LockHistoryResponse: Codable {
    let deviceId: String
    let logs: [[String: String]]

    enum CodingKeys: String, CodingKey {
        case deviceId = "device_id"
        case logs
    }
}

// MARK: - API Responses

struct ActionResponse: Codable {
    let status: String
    let deviceId: String

    enum CodingKeys: String, CodingKey {
        case status
        case deviceId = "device_id"
    }
}

struct HealthResponse: Codable {
    let status: String
    let adapters: [String]
}
