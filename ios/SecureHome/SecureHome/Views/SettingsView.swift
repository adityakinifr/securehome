import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var appState: AppState
    @AppStorage("serverURL") private var serverURL = "http://localhost:8000"
    @State private var healthStatus: HealthResponse?
    @State private var isCheckingHealth = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Server") {
                    TextField("Server URL", text: $serverURL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)

                    Button {
                        Task { await checkHealth() }
                    } label: {
                        HStack {
                            Text("Test Connection")
                            Spacer()
                            if isCheckingHealth {
                                ProgressView()
                            } else if let health = healthStatus {
                                Image(systemName: health.status == "ok" ? "checkmark.circle.fill" : "xmark.circle.fill")
                                    .foregroundStyle(health.status == "ok" ? .green : .red)
                            }
                        }
                    }
                }

                if let health = healthStatus {
                    Section("Connected Adapters") {
                        ForEach(health.adapters, id: \.self) { adapter in
                            HStack {
                                Image(systemName: adapterIcon(adapter))
                                    .foregroundStyle(.blue)
                                Text(adapter)
                            }
                        }
                    }
                }

                Section("Status") {
                    HStack {
                        Text("Total Devices")
                        Spacer()
                        Text("\(appState.devices.count)")
                            .foregroundStyle(.secondary)
                    }
                    HStack {
                        Text("Locks")
                        Spacer()
                        Text("\(appState.locks.count)")
                            .foregroundStyle(.secondary)
                    }
                    HStack {
                        Text("Cameras")
                        Spacer()
                        Text("\(appState.cameras.count)")
                            .foregroundStyle(.secondary)
                    }
                }

                Section("About") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("0.1.0")
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("Settings")
        }
    }

    private func checkHealth() async {
        isCheckingHealth = true
        do {
            let client = APIClient(baseURL: serverURL)
            healthStatus = try await client.fetchHealth()
        } catch {
            healthStatus = nil
        }
        isCheckingHealth = false
    }

    private func adapterIcon(_ name: String) -> String {
        switch name {
        case "SDMAdapter": return "video.fill"
        case "SchlageAdapter": return "lock.fill"
        case "KasaAdapter": return "lightbulb.fill"
        default: return "square.grid.2x2"
        }
    }
}
