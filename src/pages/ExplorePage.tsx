import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Shield, CheckCircle, Compass } from "lucide-react";
import { Club } from "@/types/database";

export default function ExplorePage() {
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchClubs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clubs")
      .select("*")
      .in("status", ["verified", "official"])
      .order("name");

    if (error) {
      console.error("Error fetching clubs:", error);
    } else {
      setClubs(data as Club[]);
    }
    setLoading(false);
  };

  const filteredClubs = clubs.filter(
    (club) =>
      club.name.toLowerCase().includes(search.toLowerCase()) ||
      club.city.toLowerCase().includes(search.toLowerCase()) ||
      club.country.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-16">
        {/* Header */}
        <section className="py-20 hero-gradient text-white relative overflow-hidden">
          <div className="absolute inset-0 gradient-mesh opacity-60" />
          <div className="container relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-5 py-2 mb-6">
              <Compass className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-white/70">Discover clubs</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 tracking-tight">Explore Verified Clubs</h1>
            <p className="text-lg text-white/50 mb-10 max-w-lg">
              Find your favorite football club and join their loyalty program
            </p>

            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by club name, city, or country..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 h-12 bg-white/10 border-white/10 text-white placeholder:text-white/30 rounded-full backdrop-blur-md"
              />
            </div>
          </div>
        </section>

        {/* Clubs grid */}
        <section className="py-14">
          <div className="container">
            {loading ? (
              <div className="text-center py-16">
                <div className="animate-pulse text-muted-foreground font-medium">Loading clubs...</div>
              </div>
            ) : filteredClubs.length === 0 ? (
              <div className="text-center py-16">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
                  <Shield className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">No Verified Clubs Yet</h3>
                <p className="text-muted-foreground mb-6">
                  {search ? "No clubs match your search." : "Be the first to register your club!"}
                </p>
                <Button onClick={() => navigate("/auth?role=club_admin")} className="rounded-full gradient-stadium">
                  Register Your Club
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClubs.map((club) => (
                  <Card key={club.id} className="card-hover overflow-hidden rounded-2xl border-border/50">
                    <div
                      className="h-28 flex items-center justify-center relative"
                      style={{ backgroundColor: club.primary_color || 'hsl(var(--primary))' }}
                    >
                      <div className="absolute inset-0 bg-black/10" />
                      {club.logo_url ? (
                        <img src={club.logo_url} alt={`${club.name} logo`} className="h-16 w-16 object-contain relative z-10" />
                      ) : (
                        <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center relative z-10">
                          <span className="text-2xl font-display font-bold text-white">{club.name.charAt(0)}</span>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-bold text-foreground text-lg">{club.name}</h3>
                        <Badge variant="secondary" className="badge-verified rounded-full text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
                        <MapPin className="h-3.5 w-3.5" />
                        {club.city}, {club.country}
                      </div>
                      {club.stadium_name && <p className="text-sm text-muted-foreground mb-4">{club.stadium_name}</p>}
                      <Button className="w-full rounded-xl gradient-stadium font-semibold" onClick={() => navigate(`/fan/join?club=${club.id}`)}>
                        Join Program
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
