
export const houseData = {
  honai_papua: {
    guardName: 'Penjaga Papua',
    houseName: 'Rumah Honai Papua',
    quiz: {
      intro:
        'Selamat datang di Rumah Honai Papua! Buktikan pengetahuanmu tentang budaya Pegunungan Tengah.',
      questions: [
        {
          id: 'honai_q1',
          prompt: 'Di belakang saya berdiri rumah adat bernama…',
          options: ['Rumah Honai', 'Rumah Joglo', 'Rumah Gadang'],
          correctIndex: 0,
          explanation:
            'Rumah Honai adalah rumah adat khas suku Dani yang berbentuk bundar dan beratap jerami.',
        },
        {
          id: 'honai_q2',
          prompt: 'Mengapa Rumah Honai dibuat nyaris tanpa jendela?',
          options: [
            'Untuk menahan hawa dingin pegunungan',
            'Supaya lebih mudah dipindahkan',
            'Agar cahaya matahari langsung masuk',
          ],
          correctIndex: 0,
          explanation:
            'Pegunungan Tengah Papua bersuhu dingin, sehingga Honai dibuat rapat untuk menyimpan panas.',
        },
        {
          id: 'honai_q3',
          prompt: 'Bahan tradisional yang digunakan sebagai penutup atap Rumah Honai adalah…',
          options: ['Jerami atau ilalang', 'Genteng tanah liat', 'Seng bergelombang'],
          correctIndex: 0,
          explanation:
            'Jerami atau ilalang mudah ditemukan dan sangat baik menjaga suhu di dalam Honai.',
        },
      ],
    },
  },
  krong_aceh: {
    guardName: 'Penjaga Aceh',
    houseName: 'Rumah Krong Aceh',
    quiz: {
      intro:
        'Assalamualaikum dari Tanah Rencong! Jawab kuis tentang Rumah Krong Bade bersama saya.',
      questions: [
        {
          id: 'aceh_q1',
          prompt: 'Tangga Rumah Krong Aceh selalu berjumlah ganjil karena…',
          options: [
            'Melambangkan langkah hidup yang seimbang',
            'Memudahkan air mengalir',
            'Kebetulan tukangnya suka angka ganjil',
          ],
          correctIndex: 0,
          explanation:
            'Anak tangga ganjil dipercaya membawa keseimbangan dan keberkahan bagi pemilik rumah.',
        },
        {
          id: 'aceh_q2',
          prompt: 'Fungsi utama ruang bawah rumah panggung Krong Aceh adalah…',
          options: [
            'Tempat menyimpan hasil panen dan aktivitas harian',
            'Arena balap gasing',
            'Tempat menjemur kain songket',
          ],
          correctIndex: 0,
          explanation:
            'Ruang bawah digunakan untuk aktivitas sehari-hari dan melindungi rumah dari banjir.',
        },
        {
          id: 'aceh_q3',
          prompt: 'Rumah Krong Aceh disusun tanpa paku karena…',
          options: [
            'Menggunakan sistem pasak kayu tradisional',
            'Tidak ada besi di Aceh dahulu kala',
            'Supaya mudah dilepas waktu dipindahkan',
          ],
          correctIndex: 0,
          explanation:
            'Sistem pasak membuat struktur kuat sekaligus lentur menahan gempa dan angin.',
        },
      ],
    },
  },
  lampung_sumatra: {
    guardName: 'Penjaga Lampung',
    houseName: 'Rumah Nuwo Sesat Lampung',
    quiz: {
      intro:
        'Sai Batin! Mari uji wawasanmu tentang rumah adat Lampung dan budaya Pepadun.',
      questions: [
        {
          id: 'lampung_q1',
          prompt: 'Nama lain Rumah Nuwo Sesat yang sering dipakai masyarakat Lampung adalah…',
          options: ['Balai Adat', 'Rumah Benteng', 'Gerga'],
          correctIndex: 0,
          explanation:
            'Nuwo Sesat berfungsi sebagai balai adat tempat musyawarah dan upacara besar.',
        },
        {
          id: 'lampung_q2',
          prompt: 'Warna dominan pada pakaian adat Pepadun yang dipamerkan di dalam adalah…',
          options: ['Putih dan emas', 'Merah dan hitam', 'Hijau dan silver'],
          correctIndex: 0,
          explanation:
            'Pakaian Pepadun memadukan putih dan emas sebagai simbol kesucian serta kemuliaan.',
        },
        {
          id: 'lampung_q3',
          prompt: 'Tiang-tiang tinggi pada Nuwo Sesat berguna untuk…',
          options: [
            'Melindungi rumah dari banjir dan binatang buas',
            'Menjadikan rumah terasa dingin',
            'Mengaitkan jaring ikan',
          ],
          correctIndex: 0,
          explanation:
            'Rumah panggung tinggi menjaga penghuni dari banjir, binatang liar, dan memanfaatkan ruang bawah.',
        },
      ],
    },
  },
  dayak_kalimantan: {
    guardName: 'Penjaga Dayak',
    houseName: 'Rumah Betang Dayak',
    quiz: {
      intro:
        'Selamat datang di hulu sungai! Rumah Betang menyimpan kisah kebersamaan suku Dayak.',
      questions: [
        {
          id: 'dayak_q1',
          prompt: 'Rumah Betang Dayak dikenal juga dengan sebutan…',
          options: ['Rumah Panjang', 'Rumah Gadang', 'Rumah Limas'],
          correctIndex: 0,
          explanation:
            'Rumah Betang memiliki bentuk memanjang dan bisa dihuni puluhan keluarga.',
        },
        {
          id: 'dayak_q2',
          prompt: 'Kayu yang sering dipakai untuk membangun Rumah Betang adalah…',
          options: ['Kayu ulin yang sangat kuat', 'Kayu mahoni muda', 'Bambu petung'],
          correctIndex: 0,
          explanation:
            'Kayu ulin tahan terhadap rayap dan cuaca, cocok untuk bangunan besar dan tinggi.',
        },
        {
          id: 'dayak_q3',
          prompt: 'Salah satu nilai utama yang tercermin dari Rumah Betang adalah…',
          options: [
            'Semangat hidup bersama dan gotong royong',
            'Keinginan hidup menyendiri',
            'Lomba membangun rumah tercepat',
          ],
          correctIndex: 0,
          explanation:
            'Rumah Betang menjadi pusat kehidupan kolektif dan kegiatan adat masyarakat Dayak.',
        },
      ],
    },
  },
  joglo_jawa: {
    guardName: 'Penjaga Jawa',
    houseName: 'Rumah Joglo Jawa',
    quiz: {
      intro:
        'Sugeng rawuh! Mari jawab pertanyaan budaya Jawa sambil dengarkan semilir gamelan.',
      questions: [
        {
          id: 'jawa_q1',
          prompt: 'Alat musik tradisional yang terkenal di Jawa dan tampak di dekat sini adalah…',
          options: ['Gamelan', 'Sasando', 'Kolintang'],
          correctIndex: 0,
          explanation:
            'Gamelan adalah ansambel musik Jawa dengan gong, kenong, bonang, dan saron.',
        },
        {
          id: 'jawa_q2',
          prompt: 'Empat tiang utama yang menyangga atap Joglo disebut…',
          options: ['Saka guru (soko guru)', 'Cagak duo', 'Tiang ruyung'],
          correctIndex: 0,
          explanation:
            'Soko guru adalah empat tiang pokok yang memegang peranan penting secara struktural dan simbolik.',
        },
        {
          id: 'jawa_q3',
          prompt: 'Ruang depan Joglo yang biasanya dipakai menyambut tamu disebut…',
          options: ['Pendhapa', 'Pawon', 'Gedong'],
          correctIndex: 0,
          explanation:
            'Pendhapa adalah ruang terbuka untuk menerima tamu, pertunjukan seni, atau upacara kecil.',
        },
      ],
    },
  },
  saoraja_sulsel: {
    guardName: 'Penjaga Sulawesi Selatan',
    houseName: 'Rumah Saoraja Sulsel',
    quiz: {
      intro:
        'Assalamu alaikum dari Makassar! Uji pengetahuanmu tentang rumah bangsawan Bugis-Makassar.',
      questions: [
        {
          id: 'sulsel_q1',
          prompt: 'Baju adat wanita Bugis yang dipamerkan di dalam rumah ini bernama…',
          options: ['Baju Bodo', 'Baju Kurung Teluk Belanga', 'Kebaya Encim'],
          correctIndex: 0,
          explanation:
            'Baju Bodo berbentuk segi empat berlengan pendek dan dihiasi sarung sutra serta perhiasan emas.',
        },
        {
          id: 'sulsel_q2',
          prompt: 'Jumlah anak tangga ganjil pada Saoraja melambangkan…',
          options: [
            'Tahapan kehidupan yang harus dilalui',
            'Jumlah lumbung padi keluarga',
            'Lantai rahasia untuk menyimpan senjata',
          ],
          correctIndex: 0,
          explanation:
            'Tangga ganjil dipercaya membawa keberkahan dan mengingatkan tahapan hidup manusia.',
        },
        {
          id: 'sulsel_q3',
          prompt: 'Sistem kekerabatan masyarakat Bugis-Makassar yang tercermin dalam Saoraja adalah…',
          options: ['Matrilineal, garis ibu yang dijunjung tinggi', 'Patrilineal mutlak', 'Sistem bilineal'],
          correctIndex: 0,
          explanation:
            'Saoraja menjadi simbol keluarga bangsawan dan menunjukkan penghormatan pada garis keturunan ibu.',
        },
      ],
    },
  },
  panjang_kalbar: {
    guardName: 'Penjaga Kalimantan Barat',
    houseName: 'Rumah Panjang Kalimantan Barat',
    quiz: {
      intro: 'Selamat datang di Kalimantan Barat! Mari kenali Rumah Panjang yang menjadi simbol kebersamaan suku Dayak.',
      questions: [
        {
          id: 'panjang_kalbar_q1',
          prompt: 'Rumah Panjang Kalimantan Barat dikenal juga dengan sebutan…',
          options: ['Rumah Betang', 'Rumah Gadang', 'Rumah Joglo'],
          correctIndex: 0,
          explanation:
            'Rumah Panjang atau Rumah Betang adalah rumah adat khas Dayak yang berbentuk memanjang dan dihuni banyak keluarga.',
        },
        {
          id: 'panjang_kalbar_q2',
          prompt: 'Kayu yang sering digunakan untuk membangun Rumah Panjang Kalimantan Barat adalah…',
          options: ['Kayu ulin yang sangat kuat dan tahan lama', 'Kayu jati muda', 'Bambu petung'],
          correctIndex: 0,
          explanation:
            'Kayu ulin (kayu besi) adalah kayu khas Kalimantan yang sangat kuat, tahan rayap, dan cocok untuk bangunan besar seperti Rumah Panjang.',
        },
        {
          id: 'panjang_kalbar_q3',
          prompt: 'Salah satu ciri khas Rumah Panjang Kalimantan Barat adalah…',
          options: [
            'Dibangun tinggi di atas tiang untuk melindungi dari banjir dan binatang buas',
            'Memiliki atap berbentuk tanduk kerbau',
            'Menggunakan genteng tanah liat sebagai penutup atap',
          ],
          correctIndex: 0,
          explanation:
            'Rumah Panjang dibangun tinggi di atas tiang untuk melindungi penghuni dari banjir sungai dan binatang buas di hutan Kalimantan.',
        },
      ],
    },
  },
  batak_sumut: {
    guardName: 'Penjaga Batak',
    houseName: 'Rumah Adat Batak Toba',
    quiz: {
      intro: 'Horas! Saatnya buktikan pengetahuanmu tentang rumah bolon dan kain ulos.',
      questions: [
        {
          id: 'batak_q1',
          prompt: 'Kain tradisional Batak yang menjadi kebanggaan masyarakat disebut…',
          options: ['Ulos', 'Tapis', 'Songket'],
          correctIndex: 0,
          explanation:
            'Ulos adalah kain tenun khas Batak yang sarat makna doa dan hangat secara fisik maupun spiritual.',
        },
        {
          id: 'batak_q2',
          prompt: 'Bagian tanduk besar pada atap rumah Batak melambangkan…',
          options: ['Hubungan manusia dengan leluhur dan Tuhan', 'Tempat menggantung lonceng', 'Penahan angin'],
          correctIndex: 0,
          explanation:
            'Bentuk tanduk mengarah ke langit sebagai pengingat hubungan erat manusia dengan leluhur dan Sang Pencipta.',
        },
        {
          id: 'batak_q3',
          prompt: 'Rumah bolon dibangun panggung untuk…',
          options: [
            'Melindungi dari binatang buas dan menyediakan ruang simpan',
            'Memasukkan lebih banyak cahaya',
            'Mempermudah memindahkan rumah',
          ],
          correctIndex: 0,
          explanation:
            'Rumah panggung tinggi aman dari binatang dan memanfaatkan ruang bawah untuk ternak atau penyimpanan.',
        },
      ],
    },
  },
  tolitoli_sulteng: {
    guardName: 'Penjaga Tolitoli',
    houseName: 'Rumah Adat Ngata Tolitoli',
    quiz: {
      intro: 'Salam dari Sulawesi Tengah! Yuk kenali rumah adat dan busana bangsawan Tolitoli.',
      questions: [
        {
          id: 'tolitoli_q1',
          prompt: 'Nama pakaian adat yang dipamerkan di sini adalah…',
          options: ['Pakaian Ngata / Nggoli', 'Baju Kurung Melayu', 'Beskap Solo'],
          correctIndex: 0,
          explanation:
            'Pakaian Ngata atau Nggoli dipakai bangsawan Tolitoli dengan perpaduan warna cerah dan sulaman emas.',
        },
        {
          id: 'tolitoli_q2',
          prompt: 'Rumah adat Tolitoli menggunakan warna dasar…',
          options: ['Kayu alami dengan aksen merah dan emas', 'Biru laut penuh', 'Hitam pekat'],
          correctIndex: 0,
          explanation:
            'Kayu alami dibiarkan dominan lalu diberi aksen merah dan emas sebagai simbol martabat bangsawan.',
        },
        {
          id: 'tolitoli_q3',
          prompt: 'Bagian atap rumah Tolitoli cenderung…',
          options: ['Tinggi dan runcing menyerupai tanduk', 'Rendah tanpa hiasan', 'Menggunakan genteng beton'],
          correctIndex: 0,
          explanation:
            'Atap tinggi dan runcing menunjukkan status serta memberi sirkulasi udara di iklim pesisir Sulawesi.',
        },
      ],
    },
  },
  bali_artifacts: {
    guardName: 'Penjaga Bali',
    houseName: 'Kompleks Artefak Bali',
    quiz: {
      intro: 'Om swastyastu! Tiga artefak Bali ini menyimpan filosofi sakral. Siap menjawab pertanyaannya?',
      questions: [
        {
          id: 'bali_q1',
          prompt: 'Nama busana kebesaran yang dipamerkan di sini adalah…',
          options: ['Payas Agung', 'Payas Solo', 'Payas Bodo'],
          correctIndex: 0,
          explanation:
            'Payas Agung dikenakan dalam upacara sakral Bali dengan dominasi emas dan mahkota tinggi.',
        },
        {
          id: 'bali_q2',
          prompt: 'Pelinggih Surya biasanya dipakai untuk…',
          options: [
            'Memuja Dewa Surya saat upacara di sanggah/merajan',
            'Tempat menyimpan hasil panen',
            'Menjemur kain tenun',
          ],
          correctIndex: 0,
          explanation:
            'Pelinggih Surya adalah bangunan suci untuk memuja Sang Hyang Surya dalam kompleks pura keluarga.',
        },
        {
          id: 'bali_q3',
          prompt: 'Motif ukiran pada artefak Bali sarat makna…',
          options: ['Keseimbangan alam dan spiritual', 'Kompetisi antar desa', 'Petunjuk arah mata angin'],
          correctIndex: 0,
          explanation:
            'Setiap motif menggambarkan keharmonisan bhuana agung dan bhuana alit, yaitu alam semesta dan diri manusia.',
        },
      ],
    },
  },
};
