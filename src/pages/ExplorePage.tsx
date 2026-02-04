import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Shield, CheckCircle } from "lucide-react";
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
      club.title.toLowerCase().includes(search.toLowerCase()) ||
      club.city.toLowerCase().includes(search.toLowerCase()) ||
      club.country.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-16">
        {/* Header */}
        <section className="py-16 gradient-stadium text-primary-foreground">
          <div className="container">
            <h1 className="text-4xl font-display font-bold mb-4">Explore Verified Clubs</h1>
            <p className="text-lg text-primary-foreground/80 mb-8">
              Find your favorite football club and join their loyalty program
            </p>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by club name, city, or country..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-background/90 border-0"
              />
            </div>
          </div>
        </section>

        {/* Clubs grid */}
        <section className="py-12">
          <div className="container">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-pulse text-muted-foreground">Loading clubs...</div>
              </div>
            ) : filteredClubs.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Verified Clubs Yet</h3>
                <p className="text-muted-foreground mb-4">
                  {search ? "No clubs match your search." : "Be the first to register your club!"}
                </p>
                <Button onClick={() => navigate("/auth?role=club_admin")}>Register Your Club</Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClubs.map((club) => (
                  <Card key={club.id} className="card-hover overflow-hidden">
                    <div
                      className="h-24 flex items-center justify-center"
                      style={{ backgroundColor: club.primary_color }}
                    >
                      {club.logo_url ? (
                        <img src={club.logo_url} alt={`${club.title} logo`} className="h-16 w-16 object-contain" />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                          <span className="text-2xl font-bold text-primary-foreground">{club.title.charAt(0)}</span>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-foreground">{club.title}</h3>
                        <Badge variant="secondary" className="badge-verified">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                        <MapPin className="h-4 w-4" />
                        {club.city}, {club.country}
                      </div>
                      {club.stadium_name && <p className="text-sm text-muted-foreground mb-4">{club.stadium_name}</p>}
                      <Button className="w-full" onClick={() => navigate(`/fan/join?club=${club.id}`)}>
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
