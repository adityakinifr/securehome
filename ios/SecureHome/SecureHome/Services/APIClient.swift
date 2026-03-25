import Foundation

actor APIClient {
    static let shared = APIClient()

    // Change this to your server's IP/hostname
    private let baseURL: String

    init(baseURL: String = "http://localhost:8000") {
        self.baseURL = baseURL
    }

    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        return d
    }()

    // MARK: - Generic request

    private func request<T: Decodable>(_ method: String, path: String) async throws -> T {
        guard let url = URL(string: "\(baseURL)\(path)") else {
            throw APIError.invalidURL
        }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.timeoutInterval = 30

        let (data, response) = try await URLSession.shared.data(for: req)

        guard let http = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        guard (200...299).contains(http.statusCode) else {
            throw APIError.serverError(http.statusCode)
        }

        return try decoder.decode(T.self, from: data)
    }

    private func get<T: Decodable>(_ path: String) async throws -> T {
        try await request("GET", path: path)
    }

    private func post<T: Decodable>(_ path: String) async throws -> T {
        try await request("POST", path: path)
    }

    // MARK: - API Methods

    func fetchDevices() async throws -> [Device] {
        try await get("/api/devices")
    }

    func fetchNightCheck() async throws -> NightCheckResult {
        try await get("/api/night-check")
    }

    func lockAll() async throws -> NightCheckLockAllResponse {
        try await post("/api/night-check/lock-all")
    }

    func fetchVisitorSummary() async throws -> VisitorSummary {
        try await get("/api/summary")
    }

    func lockDevice(_ deviceId: String) async throws -> ActionResponse {
        try await post("/api/devices/\(deviceId)/lock")
    }

    func unlockDevice(_ deviceId: String) async throws -> ActionResponse {
        try await post("/api/devices/\(deviceId)/unlock")
    }

    func turnOn(_ deviceId: String) async throws -> ActionResponse {
        try await post("/api/devices/\(deviceId)/on")
    }

    func turnOff(_ deviceId: String) async throws -> ActionResponse {
        try await post("/api/devices/\(deviceId)/off")
    }

    func fetchHealth() async throws -> HealthResponse {
        try await get("/api/health")
    }
}

// MARK: - Supporting types

enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case serverError(Int)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .invalidResponse: return "Invalid response from server"
        case .serverError(let code): return "Server error: \(code)"
        }
    }
}

struct NightCheckLockAllResponse: Codable {
    let result: NightCheckResult
    let autoLocked: [String]

    enum CodingKeys: String, CodingKey {
        case result
        case autoLocked = "auto_locked"
    }
}
