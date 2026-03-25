import SwiftUI

struct ContentView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        TabView {
            DashboardView()
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }

            DevicesView()
                .tabItem {
                    Label("Devices", systemImage: "square.grid.2x2.fill")
                }

            NightCheckView()
                .tabItem {
                    Label("Security", systemImage: "shield.fill")
                }

            VisitorSummaryView()
                .tabItem {
                    Label("Visitors", systemImage: "person.2.fill")
                }

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gear")
                }
        }
        .tint(.blue)
        .task {
            await appState.refreshAll()
        }
    }
}
