// Real-world geographic coordinates (Latitude, Longitude) for Bangladesh Divisions,
// all 64 Districts, and Upazilas for background proximity sorting without GPS permissions.

export type LatLng = [number, number];

export const DIVISION_COORDS: Record<string, LatLng> = {
  Dhaka: [23.8103, 90.4125],
  Chattogram: [22.3569, 91.7832],
  Rajshahi: [24.3745, 88.6042],
  Khulna: [22.8456, 89.5403],
  Barishal: [22.701, 90.3535],
  Sylhet: [24.8949, 91.8687],
  Rangpur: [25.7439, 89.2752],
  Mymensingh: [24.7471, 90.4203],
};

export const DISTRICT_COORDS: Record<string, LatLng> = {
  // Dhaka Division
  Dhaka: [23.8103, 90.4125],
  Faridpur: [23.607, 89.8429],
  Gazipur: [23.9999, 90.4203],
  Gopalganj: [23.005, 89.8266],
  Kishoreganj: [24.4449, 90.7766],
  Madaripur: [23.1641, 90.1897],
  Manikganj: [23.8644, 90.0047],
  Munshiganj: [23.5422, 90.5305],
  Narayanganj: [23.6238, 90.5],
  Narsingdi: [23.9322, 90.7154],
  Rajbari: [23.7574, 89.6445],
  Shariatpur: [23.2423, 90.4348],
  Tangail: [24.2513, 89.9167],

  // Chattogram Division
  Bandarban: [22.1953, 92.2184],
  Brahmanbaria: [23.9571, 91.1119],
  Chandpur: [23.2333, 90.6713],
  Chattogram: [22.3569, 91.7832],
  Cumilla: [23.4607, 91.1809],
  "Cox's Bazar": [21.4272, 92.0058],
  Feni: [23.0159, 91.3976],
  Khagrachhari: [23.1193, 91.9847],
  Lakshmipur: [22.9447, 90.8282],
  Noakhali: [22.8696, 91.0994],
  Rangamati: [22.6556, 92.1754],

  // Rajshahi Division
  Bogura: [24.8481, 89.373],
  Joypurhat: [25.0968, 89.0227],
  Naogaon: [24.7936, 88.9318],
  Natore: [24.4206, 89.0006],
  Chapainawabganj: [24.5965, 88.2775],
  Pabna: [24.0063, 89.2372],
  Rajshahi: [24.3745, 88.6042],
  Sirajganj: [24.4534, 89.7007],

  // Khulna Division
  Bagerhat: [22.6516, 89.7859],
  Chuadanga: [23.6402, 88.8418],
  Jashore: [23.1664, 89.2081],
  Jhenaidah: [23.545, 89.1726],
  Khulna: [22.8456, 89.5403],
  Kushtia: [23.9013, 89.1204],
  Magura: [23.4873, 89.4199],
  Meherpur: [23.7622, 88.6318],
  Narail: [23.1725, 89.5127],
  Satkhira: [22.7185, 89.0705],

  // Barishal Division
  Barguna: [22.1592, 90.1256],
  Barishal: [22.701, 90.3535],
  Bhola: [22.6859, 90.6482],
  Jhalokati: [22.6406, 90.1987],
  Patuakhali: [22.3596, 90.3299],
  Pirojpur: [22.5841, 89.972],

  // Sylhet Division
  Habiganj: [24.3749, 91.4155],
  Moulvibazar: [24.4829, 91.7774],
  Sunamganj: [25.0658, 91.395],
  Sylhet: [24.8949, 91.8687],

  // Rangpur Division
  Dinajpur: [25.6217, 88.6354],
  Gaibandha: [25.3288, 89.5281],
  Kurigram: [25.8054, 89.6362],
  Lalমনিরhat: [25.9923, 89.2847],
  Lalmonirhat: [25.9923, 89.2847],
  Nilphamari: [25.9318, 88.856],
  Panchagarh: [26.3411, 88.5542],
  Rangpur: [25.7439, 89.2752],
  Thakurgaon: [26.0337, 88.4617],

  // Mymensingh Division
  Jamalpur: [24.9375, 89.9378],
  Mymensingh: [24.7471, 90.4203],
  Netrokona: [24.871, 90.7279],
  Sherpur: [25.0205, 90.0153],
};

// Real Upazila coordinates for high-precision intra-district & inter-district sorting
export const UPAZILA_COORDS: Record<string, LatLng> = {
  // Munshiganj District Upazilas
  Sirajdikhan: [23.5936, 90.3804],
  Sreenagar: [23.535, 90.2917],
  Tongibari: [23.5042, 90.4578],
  Lohajang: [23.4667, 90.3333],
  "Munshiganj Sadar": [23.5422, 90.5305],
  Gazaria: [23.5417, 90.6083],

  // Dhaka District Upazilas / Thanas
  Keraniganj: [23.6889, 90.3361],
  Nawabganj: [23.6667, 90.1667],
  Dohar: [23.5944, 90.1222],
  Savar: [23.8583, 90.2667],
  Dhamrai: [23.9125, 90.2139],
  Dhanmondi: [23.7461, 90.3742],
  Motijheel: [23.733, 90.4172],
  Mirpur: [23.8042, 90.3667],
  Mohammadpur: [23.7658, 90.3584],
  Gulshan: [23.7925, 90.4078],
  Uttara: [23.8759, 90.3795],
  Tejgaon: [23.7619, 90.3917],
  Badda: [23.7805, 90.4267],
  Jatrabari: [23.7104, 90.4354],
  Khilgaon: [23.7517, 90.4258],
  Ramna: [23.7381, 90.4025],
  Lalbagh: [23.7189, 90.3881],
  Kotwali: [23.7073, 90.4091],
  Hazaribagh: [23.7347, 90.3644],
  Pallabi: [23.8261, 90.3656],
  Cantonment: [23.8181, 90.4014],
  Demra: [23.7222, 90.4889],
  Shyampur: [23.6917, 90.4322],
  Sutrapur: [23.7022, 90.4192],

  // Narayanganj District Upazilas
  "Narayanganj Sadar": [23.6238, 90.5],
  Bandar: [23.6167, 90.5333],
  Sonargaon: [23.65, 90.6],
  Rupganj: [23.7917, 90.525],
  Araihazar: [23.7833, 90.65],

  // Gazipur District Upazilas
  "Gazipur Sadar": [23.9999, 90.4203],
  Kaliakair: [24.075, 90.2167],
  Kaliganj: [23.925, 90.5667],
  Kapasia: [24.1, 90.5667],
  Sreepur: [24.2, 90.4667],
};

function hashText(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function resolveCoordinates(loc: {
  division?: string;
  district?: string;
  upazila?: string;
}): LatLng {
  if (loc.upazila && UPAZILA_COORDS[loc.upazila]) {
    return UPAZILA_COORDS[loc.upazila];
  }

  if (loc.district && DISTRICT_COORDS[loc.district]) {
    const [baseLat, baseLng] = DISTRICT_COORDS[loc.district];
    if (loc.upazila) {
      // Deterministic ~3km to ~16km sub-district offset for upazilas not explicitly hardcoded
      const h = hashText(`${loc.district}:${loc.upazila}`);
      const angle = ((h % 360) * Math.PI) / 180;
      const radiusDeg = 0.03 + ((h >> 8) % 100) * 0.0012;
      return [
        baseLat + Math.sin(angle) * radiusDeg,
        baseLng + Math.cos(angle) * radiusDeg,
      ];
    }
    return [baseLat, baseLng];
  }

  if (loc.division && DIVISION_COORDS[loc.division]) {
    return DIVISION_COORDS[loc.division];
  }

  return DIVISION_COORDS.Dhaka;
}

/**
 * Calculates real-world Haversine distance in kilometers between two locations
 * without requiring user GPS permissions.
 */
export function getLocationDistanceKm(
  from: { division?: string; district?: string; upazila?: string },
  to: { division?: string; district?: string; upazila?: string }
): number {
  if (
    from.upazila &&
    to.upazila &&
    from.upazila === to.upazila &&
    (!from.district || !to.district || from.district === to.district)
  ) {
    return 0;
  }

  const [lat1, lon1] = resolveCoordinates(from);
  const [lat2, lon2] = resolveCoordinates(to);

  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
