# Bus Route Source Data Audit

Source: the eight attached photographs supplied with the M5.10 bus-route task.
The photographs are the source of truth; names and timings below preserve the
visible wording and capitalization as closely as possible.

## Coverage

Eight routes are visible: 1, 2, 3, 4, 5, 6, 7, and 8. Every visible stop is
represented in `frontend/src/data/collegeBusRoutes.json`. The source photos do
not show coordinates or fees, so this feature does not claim a distance or fee.

## Verified route order and timings

- Route 1: Mallatha halli Cross (7:05 AM) → Ambedkar College (7:08 AM) → Deepa Complex (7:10 AM) → Nagarabavi BDA Complex (7:14 AM) → Kottige palya (7:17 AM) → Sumnahalli Bridge (7:18 AM) → Rajkumar Samadi (7:23 AM) → Kanteerava Studio (7:25 AM) → Laggere cross (7:27 AM) → Jalahalli Cross (7:32 AM) → Ayyappa temple (7:35 AM) → Shettihalli Cross (7:38 AM) → KG Halli (7:40 AM) → SVIT Campus (8:15 AM).
- Route 2: Nagarabavi Circle (6:55 AM) → Moodalapalya Main Road (6:57 AM) → Shoba Hospital (6:59 AM) → Govindaraja Nagara Junction (7:02 AM) → KHB quarters (7:07 AM) → Basaveshwaranagar Water tank (7:10 AM) → Shankar Mutt (7:12 AM) → Modi Hospital (7:14 AM) → Navarang Bridge (7:14 AM) → Mahalakshmi Layout Entrance (7:18 AM) → Yeshwanthpura (7:22 AM) → Mathikere (7:25 AM) → SVIT Campus (8:15 AM).
- Route 3: Ramakrishna Ashrama (7:00 AM) → Majestic Railway station (7:07 AM) → Sujatha Theatre (7:12 AM) → Navarang (7:15 AM) → Devaiah park (7:20 AM) → Malleswaram (7:25 AM) → Malleswaram 8th Cross (7:28 AM) → Malleswaram 18th Cross (7:30 AM) → Bhasham Circle (7:32 AM) → Cauvery Junction (7:34 AM) → Mekhri Circle (7:39 AM) → CBI (7:40 AM) → Hebbala (7:42 AM) → Esteem mall (7:44 AM) → Kodigehalli Gate (7:45 AM) → Byatarayanapura (7:47 AM) → GKVK (7:48 AM) → Jakkur Aerodrum (7:50 AM) → Allalasandra (7:51 AM) → SVIT Campus (8:20 AM).
- Route 4: K.R Puram (7:00 AM) → Ramamurthy Nagar (7:05 AM) → Horamavu Junction (7:09 AM) → Hennur Cross (7:13 AM) → Nagavara (7:15 AM) → Hebbala ring road (7:20 AM) → Esteem mall (7:23 AM) → Yelahanka Old town (7:30 AM) → Venkatala (7:35 AM) → Bagalur cross (7:40 AM) → Hunsamaranahalli (7:45 AM) → MVIT Cross (7:48 AM) → SVIT Campus (8:10 AM).
- Route 5: Sanjay nagar (7:10 AM) → Nagashetti halli (7:13 AM) → Badrappa layout (7:17 AM) → Tata nagar (7:20 AM) → Kodigehalli Ganapathi temple (7:23 AM) → More stop (7:26 AM) → Tennis court (7:29 AM) → Tindlu (7:35 AM) → Vidyaranyapura Post office (7:38 AM) → Vidyaranyapura Eechalamara (7:40 AM) → Vidyaranyapura Bus stop (7:42 AM) → Jelli Machine (7:45 AM) → Doddabettahalli (7:48 AM) → SVIT Campus (8:15 AM).
- Route 6: 8th Mile (7:15 AM) → Bagalagunte (7:20 AM) → Chikkabanavara bus stop (7:25 AM) → Abbigere (7:30 AM) → Gangamma circle (7:40 AM) → MS Palya (7:47 AM) → Sambhram College (7:50 AM) → Byalakere (7:55 AM) → Mylapanahalli (7:58 AM) → Yelahanka RTO (8:00 AM) → SVIT Campus (8:15 AM).
- Route 7: Mathikere (7:20 AM) → Gokula (7:22 AM) → BEL Circle (7:25 AM) → Dodda bommasandra (7:28 AM) → Nanjappa Circle (7:30 AM) → Vidyaranyapura 1st Block (7:35 AM) → Thirumala Dhaba (7:40 AM) → Attur layout (7:42 AM) → SVIT Campus (8:15 AM).
- Route 8: Kogilu cross (7:30 AM) → Yelahanka Old Town (7:32 AM) → NES (7:37 AM) → Sharavathi (7:40 AM) → Chikkabommasandra cross (7:42 AM) → Agarwal Eye hospital (7:44 AM) → Yelahanka Newtown (7:45 AM) → Dairy Circle (7:47 AM) → Yelahanka 4th Phase (7:52 AM) → Shivamandira (7:55 AM) → Ananathapura Gate (8:00 AM) → Nagenagahalli (8:05 AM) → Singanayakanahalli (8:10 AM) → SVIT Campus (8:15 AM).

## People visible in the photographs

Driver/coordinator names and phone numbers are retained in the machine-readable
route data. Route 6's staff-coordinator field is not fully visible in the
attached crop and remains `null`; it is not fabricated.

## Validation notes

- Multiple buses serving one stop are represented (for example, Mathikere and
  Esteem mall).
- Shared route portions are represented independently in route order.
- No stop, route, coordinate, distance, or fee was invented.
- The pre-existing app data had incorrect Route 1 times; those times are being
  corrected to the photograph values above.
