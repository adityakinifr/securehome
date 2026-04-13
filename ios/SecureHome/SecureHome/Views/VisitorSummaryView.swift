import SwiftUI

struct VisitorSummaryView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    if let summary = appState.visitorSummary {
                        // Date header
                        Text(summary.date)
                            .font(.headline)
                            .foregroundStyle(.secondary)

                        // Stats
                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible()),
                            GridItem(.flexible()),
                        ], spacing: 12) {
                            SummaryStatCard(
                                title: "People",
                                count: summary.totalPersonEvents,
                                icon: "person.fill",
                                color: .blue
                            )
                            SummaryStatCard(
                                title: "Doorbell",
                                count: summary.totalDoorbellPresses,
                                icon: "bell.fill",
                                color: .orange
                            )
                            SummaryStatCard(
                                title: "Motion",
                                count: summary.totalMotionEvents,
                                icon: "figure.walk",
                                color: .purple
                            )
                        }

                        // Event timeline
                        if !summary.events.isEmpty {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Event Timeline")
                                    .font(.headline)

                                ForEach(summary.events) { event in
                                    EventRow(event: event)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        } else {
                            ContentUnavailableView(
                                "No Events Today",
                                systemImage: "calendar",
                                description: Text("No visitor events recorded yet")
                            )
                            .padding(.top, 40)
                        }
                    } else {
                        ContentUnavailableView(
                            "No Summary",
                            systemImage: "chart.bar",
                            description: Text("Pull to refresh")
                        )
                    }
                }
                .padding()
            }
            .navigationTitle("Visitors")
            .refreshable {
                await appState.loadVisitorSummary()
            }
        }
    }
}

// MARK: - Summary Stat Card

struct SummaryStatCard: View {
    let title: String
    let count: Int
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)
            Text("\(count)")
                .font(.title2)
                .fontWeight(.bold)
            Text(title)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Event Row

struct EventRow: View {
    let event: CameraEvent

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: eventIcon)
                .foregroundStyle(eventColor)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text(event.eventType.capitalized)
                    .font(.subheadline)
                    .fontWeight(.medium)
                Text(event.deviceName.isEmpty ? event.deviceId : event.deviceName)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Text(formattedTime)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }

    private var eventIcon: String {
        switch event.eventType {
        case "PERSON": return "person.fill"
        case "DOORBELL": return "bell.fill"
        case "MOTION": return "figure.walk"
        case "SOUND": return "speaker.wave.2.fill"
        default: return "questionmark.circle"
        }
    }

    private var eventColor: Color {
        switch event.eventType {
        case "PERSON": return .blue
        case "DOORBELL": return .orange
        case "MOTION": return .purple
        case "SOUND": return .green
        default: return .gray
        }
    }

    private var formattedTime: String {
        if let range = event.timestamp.range(of: "T") {
            return String(event.timestamp[range.upperBound...].prefix(8))
        }
        return event.timestamp
    }
}
