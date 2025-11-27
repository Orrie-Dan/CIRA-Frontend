import { Mail, Phone } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img
                src="/Coat_of_Arms_Rwanda-01.png"
                alt="Rwanda Coat of Arms"
                className="h-6 w-6 rounded-full bg-white object-contain p-[2px]"
              />
              <h3 className="font-bold text-lg">City Infrastructure</h3>
            </div>
            <p className="text-sm text-primary-foreground/80">
              Working together to maintain and improve our community infrastructure.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li>
                <a href="#" className="hover:text-primary-foreground transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary-foreground transition-colors">
                  Report an Issue
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary-foreground transition-colors">
                  Check Status
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary-foreground transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>(555) 123-4567</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>infrastructure@city.gov</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center text-sm text-primary-foreground/70">
          <p>&copy; {new Date().getFullYear()} Citizens Infrastructure Reporting Application. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
