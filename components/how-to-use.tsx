import { Card } from "@/components/ui/card"
import { MapPin, FileText, Send, CheckCircle } from "lucide-react"

export function HowToUse() {
  const steps = [
    {
      icon: MapPin,
      title: "Locate the Issue",
      description:
        "Click on the map where you noticed the infrastructure problem - pothole, broken streetlight, damaged sidewalk, etc.",
    },
    {
      icon: FileText,
      title: "Describe the Problem",
      description:
        "Fill out the form with details about the issue, including type, severity, and any additional notes.",
    },
    {
      icon: Send,
      title: "Submit Report",
      description: "Send your report to the city maintenance department for review and action.",
    },
    {
      icon: CheckCircle,
      title: "Track Progress",
      description: "Monitor the status of your report and see when maintenance crews address the issue.",
    },
  ]

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Reporting infrastructure issues is simple and helps keep our community safe and well-maintained.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <Card key={index} className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <step.icon className="h-8 w-8 text-primary" />
              </div>
              <div className="text-sm font-semibold text-primary mb-2">Step {index + 1}</div>
              <h3 className="text-xl font-bold mb-3">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
