/* Birth places: name|region|lat|lon (Indian cities use Asia/Kolkata) */
const IN = `Ahmedabad|Gujarat|23.0225|72.5714
Surat|Gujarat|21.1702|72.8311
Vadodara|Gujarat|22.3072|73.1812
Rajkot|Gujarat|22.3039|70.8022
Bhavnagar|Gujarat|21.7645|72.1519
Jamnagar|Gujarat|22.4707|70.0577
Junagadh|Gujarat|21.5222|70.4579
Gandhinagar|Gujarat|23.2156|72.6369
Anand|Gujarat|22.5645|72.9289
Nadiad|Gujarat|22.6916|72.8634
Mehsana|Gujarat|23.5880|72.3693
Bhuj|Gujarat|23.2420|69.6669
Morbi|Gujarat|22.8173|70.8377
Porbandar|Gujarat|21.6417|69.6293
Navsari|Gujarat|20.9467|72.9520
Valsad|Gujarat|20.5992|72.9342
Vapi|Gujarat|20.3893|72.9106
Bharuch|Gujarat|21.7051|72.9959
Ankleshwar|Gujarat|21.6264|73.0152
Amreli|Gujarat|21.6032|71.2221
Surendranagar|Gujarat|22.7277|71.6480
Palanpur|Gujarat|24.1725|72.4381
Deesa|Gujarat|24.2585|72.1907
Patan|Gujarat|23.8493|72.1266
Godhra|Gujarat|22.7788|73.6143
Dahod|Gujarat|22.8345|74.2531
Gondal|Gujarat|21.9619|70.7923
Botad|Gujarat|22.1700|71.6684
Veraval|Gujarat|20.9159|70.3629
Jetpur|Gujarat|21.7548|70.6234
Dwarka|Gujarat|22.2394|68.9678
Gandhidham|Gujarat|23.0753|70.1337
Himmatnagar|Gujarat|23.5980|72.9630
Kalol|Gujarat|23.2464|72.4967
Dholka|Gujarat|22.7270|72.4410
Viramgam|Gujarat|23.1200|72.0300
Upleta|Gujarat|21.7409|70.2827
Mahuva|Gujarat|21.0902|71.7600
Savarkundla|Gujarat|21.3370|71.3030
Keshod|Gujarat|21.3000|70.2500
Visnagar|Gujarat|23.6980|72.5450
Modasa|Gujarat|23.4630|73.2990
Una|Gujarat|20.8230|71.0380
Mumbai|Maharashtra|19.0760|72.8777
Thane|Maharashtra|19.2183|72.9781
Navi Mumbai|Maharashtra|19.0330|73.0297
Pune|Maharashtra|18.5204|73.8567
Nagpur|Maharashtra|21.1458|79.0882
Nashik|Maharashtra|19.9975|73.7898
Chhatrapati Sambhajinagar (Aurangabad)|Maharashtra|19.8762|75.3433
Solapur|Maharashtra|17.6599|75.9064
Kolhapur|Maharashtra|16.7050|74.2433
Amravati|Maharashtra|20.9320|77.7523
Jalgaon|Maharashtra|21.0077|75.5626
Akola|Maharashtra|20.7002|77.0082
Sangli|Maharashtra|16.8524|74.5815
Nanded|Maharashtra|19.1383|77.3210
Ahilyanagar (Ahmednagar)|Maharashtra|19.0948|74.7480
Delhi|Delhi|28.7041|77.1025
New Delhi|Delhi|28.6139|77.2090
Gurugram|Haryana|28.4595|77.0266
Faridabad|Haryana|28.4089|77.3178
Noida|Uttar Pradesh|28.5355|77.3910
Ghaziabad|Uttar Pradesh|28.6692|77.4538
Bengaluru|Karnataka|12.9716|77.5946
Mysuru|Karnataka|12.2958|76.6394
Mangaluru|Karnataka|12.9141|74.8560
Hubballi|Karnataka|15.3647|75.1240
Belagavi|Karnataka|15.8497|74.4977
Udupi|Karnataka|13.3409|74.7421
Chennai|Tamil Nadu|13.0827|80.2707
Coimbatore|Tamil Nadu|11.0168|76.9558
Madurai|Tamil Nadu|9.9252|78.1198
Tiruchirappalli|Tamil Nadu|10.7905|78.7047
Salem|Tamil Nadu|11.6643|78.1460
Tirunelveli|Tamil Nadu|8.7139|77.7567
Vellore|Tamil Nadu|12.9165|79.1325
Hyderabad|Telangana|17.3850|78.4867
Warangal|Telangana|17.9689|79.5941
Visakhapatnam|Andhra Pradesh|17.6868|83.2185
Vijayawada|Andhra Pradesh|16.5062|80.6480
Tirupati|Andhra Pradesh|13.6288|79.4192
Guntur|Andhra Pradesh|16.3067|80.4365
Nellore|Andhra Pradesh|14.4426|79.9865
Kolkata|West Bengal|22.5726|88.3639
Howrah|West Bengal|22.5958|88.2636
Siliguri|West Bengal|26.7271|88.3953
Durgapur|West Bengal|23.5204|87.3119
Jaipur|Rajasthan|26.9124|75.7873
Jodhpur|Rajasthan|26.2389|73.0243
Udaipur|Rajasthan|24.5854|73.7125
Kota|Rajasthan|25.2138|75.8648
Ajmer|Rajasthan|26.4499|74.6399
Bikaner|Rajasthan|28.0229|73.3119
Bhilwara|Rajasthan|25.3407|74.6313
Mount Abu|Rajasthan|24.5926|72.7156
Sri Ganganagar|Rajasthan|29.9038|73.8772
Lucknow|Uttar Pradesh|26.8467|80.9462
Kanpur|Uttar Pradesh|26.4499|80.3319
Varanasi|Uttar Pradesh|25.3176|82.9739
Agra|Uttar Pradesh|27.1767|78.0081
Prayagraj|Uttar Pradesh|25.4358|81.8463
Meerut|Uttar Pradesh|28.9845|77.7064
Gorakhpur|Uttar Pradesh|26.7606|83.3732
Mathura|Uttar Pradesh|27.4924|77.6737
Ayodhya|Uttar Pradesh|26.7922|82.1998
Bareilly|Uttar Pradesh|28.3670|79.4304
Aligarh|Uttar Pradesh|27.8974|78.0880
Jhansi|Uttar Pradesh|25.4484|78.5685
Bhopal|Madhya Pradesh|23.2599|77.4126
Indore|Madhya Pradesh|22.7196|75.8577
Gwalior|Madhya Pradesh|26.2183|78.1828
Jabalpur|Madhya Pradesh|23.1815|79.9864
Ujjain|Madhya Pradesh|23.1765|75.7885
Sagar|Madhya Pradesh|23.8388|78.7378
Ratlam|Madhya Pradesh|23.3315|75.0367
Patna|Bihar|25.5941|85.1376
Gaya|Bihar|24.7955|85.0002
Muzaffarpur|Bihar|26.1209|85.3647
Bhagalpur|Bihar|25.2425|86.9842
Darbhanga|Bihar|26.1542|85.8918
Ranchi|Jharkhand|23.3441|85.3096
Jamshedpur|Jharkhand|22.8046|86.2029
Dhanbad|Jharkhand|23.7957|86.4304
Bhubaneswar|Odisha|20.2961|85.8245
Cuttack|Odisha|20.4625|85.8830
Puri|Odisha|19.8135|85.8312
Rourkela|Odisha|22.2604|84.8536
Raipur|Chhattisgarh|21.2514|81.6296
Bhilai|Chhattisgarh|21.1938|81.3509
Bilaspur|Chhattisgarh|22.0797|82.1409
Chandigarh|Chandigarh|30.7333|76.7794
Ludhiana|Punjab|30.9010|75.8573
Amritsar|Punjab|31.6340|74.8723
Jalandhar|Punjab|31.3260|75.5762
Patiala|Punjab|30.3398|76.3869
Ambala|Haryana|30.3782|76.7767
Panipat|Haryana|29.3909|76.9635
Hisar|Haryana|29.1492|75.7217
Rohtak|Haryana|28.8955|76.6066
Shimla|Himachal Pradesh|31.1048|77.1734
Dharamshala|Himachal Pradesh|32.2190|76.3234
Manali|Himachal Pradesh|32.2432|77.1892
Dehradun|Uttarakhand|30.3165|78.0322
Haridwar|Uttarakhand|29.9457|78.1642
Rishikesh|Uttarakhand|30.0869|78.2676
Nainital|Uttarakhand|29.3803|79.4636
Srinagar|Jammu and Kashmir|34.0837|74.7973
Jammu|Jammu and Kashmir|32.7266|74.8570
Leh|Ladakh|34.1526|77.5771
Guwahati|Assam|26.1445|91.7362
Dibrugarh|Assam|27.4728|94.9120
Silchar|Assam|24.8333|92.7789
Shillong|Meghalaya|25.5788|91.8933
Imphal|Manipur|24.8170|93.9368
Aizawl|Mizoram|23.7271|92.7176
Agartala|Tripura|23.8315|91.2868
Kohima|Nagaland|25.6751|94.1086
Itanagar|Arunachal Pradesh|27.0844|93.6053
Gangtok|Sikkim|27.3389|88.6065
Thiruvananthapuram|Kerala|8.5241|76.9366
Kochi|Kerala|9.9312|76.2673
Kozhikode|Kerala|11.2588|75.7804
Thrissur|Kerala|10.5276|76.2144
Kannur|Kerala|11.8745|75.3704
Panaji|Goa|15.4909|73.8278
Margao|Goa|15.2832|73.9862
Puducherry|Puducherry|11.9416|79.8083
Port Blair|Andaman and Nicobar|11.6234|92.7265
Daman|Dadra Nagar Haveli and Daman Diu|20.3974|72.8328
Silvassa|Dadra Nagar Haveli and Daman Diu|20.2766|73.0083`;
const WORLD = `London|United Kingdom|51.5074|-0.1278|Europe/London
Leicester|United Kingdom|52.6369|-1.1398|Europe/London
Birmingham|United Kingdom|52.4862|-1.8904|Europe/London
New York|USA|40.7128|-74.0060|America/New_York
Edison, New Jersey|USA|40.5187|-74.4121|America/New_York
Boston|USA|42.3601|-71.0589|America/New_York
Washington DC|USA|38.9072|-77.0369|America/New_York
Atlanta|USA|33.7490|-84.3880|America/New_York
Chicago|USA|41.8781|-87.6298|America/Chicago
Houston|USA|29.7604|-95.3698|America/Chicago
Dallas|USA|32.7767|-96.7970|America/Chicago
Phoenix|USA|33.4484|-112.0740|America/Phoenix
Los Angeles|USA|34.0522|-118.2437|America/Los_Angeles
San Francisco|USA|37.7749|-122.4194|America/Los_Angeles
San Jose|USA|37.3382|-121.8863|America/Los_Angeles
Seattle|USA|47.6062|-122.3321|America/Los_Angeles
Toronto|Canada|43.6532|-79.3832|America/Toronto
Brampton|Canada|43.7315|-79.7624|America/Toronto
Calgary|Canada|51.0447|-114.0719|America/Edmonton
Vancouver|Canada|49.2827|-123.1207|America/Vancouver
Dubai|UAE|25.2048|55.2708|Asia/Dubai
Abu Dhabi|UAE|24.4539|54.3773|Asia/Dubai
Sharjah|UAE|25.3463|55.4209|Asia/Dubai
Muscat|Oman|23.5880|58.3829|Asia/Muscat
Doha|Qatar|25.2854|51.5310|Asia/Qatar
Riyadh|Saudi Arabia|24.7136|46.6753|Asia/Riyadh
Jeddah|Saudi Arabia|21.4858|39.1925|Asia/Riyadh
Kuwait City|Kuwait|29.3759|47.9774|Asia/Kuwait
Manama|Bahrain|26.2285|50.5860|Asia/Bahrain
Singapore|Singapore|1.3521|103.8198|Asia/Singapore
Kuala Lumpur|Malaysia|3.1390|101.6869|Asia/Kuala_Lumpur
Bangkok|Thailand|13.7563|100.5018|Asia/Bangkok
Hong Kong|China|22.3193|114.1694|Asia/Hong_Kong
Tokyo|Japan|35.6762|139.6503|Asia/Tokyo
Sydney|Australia|-33.8688|151.2093|Australia/Sydney
Melbourne|Australia|-37.8136|144.9631|Australia/Melbourne
Perth|Australia|-31.9505|115.8605|Australia/Perth
Auckland|New Zealand|-36.8485|174.7633|Pacific/Auckland
Kathmandu|Nepal|27.7172|85.3240|Asia/Kathmandu
Dhaka|Bangladesh|23.8103|90.4125|Asia/Dhaka
Colombo|Sri Lanka|6.9271|79.8612|Asia/Colombo
Karachi|Pakistan|24.8607|67.0011|Asia/Karachi
Lahore|Pakistan|31.5204|74.3587|Asia/Karachi
Nairobi|Kenya|-1.2921|36.8219|Africa/Nairobi
Kampala|Uganda|0.3476|32.5825|Africa/Kampala
Dar es Salaam|Tanzania|-6.7924|39.2083|Africa/Dar_es_Salaam
Johannesburg|South Africa|-26.2041|28.0473|Africa/Johannesburg
Durban|South Africa|-29.8587|31.0218|Africa/Johannesburg
Port Louis|Mauritius|-20.1609|57.5012|Indian/Mauritius
Paris|France|48.8566|2.3522|Europe/Paris
Berlin|Germany|52.5200|13.4050|Europe/Berlin
Frankfurt|Germany|50.1109|8.6821|Europe/Berlin
Amsterdam|Netherlands|52.3676|4.9041|Europe/Amsterdam
Zurich|Switzerland|47.3769|8.5417|Europe/Zurich
Moscow|Russia|55.7558|37.6173|Europe/Moscow
Suva|Fiji|-18.1248|178.4501|Pacific/Fiji
Port of Spain|Trinidad and Tobago|10.6549|-61.5019|America/Port_of_Spain`;
window.PLACES = [
  ...IN.split('\n').map(l => { const [n, r, a, o] = l.split('|'); return { name: n, region: r + ', India', lat: +a, lon: +o, tz: 'Asia/Kolkata' }; }),
  ...WORLD.split('\n').map(l => { const [n, r, a, o, t] = l.split('|'); return { name: n, region: r, lat: +a, lon: +o, tz: t }; })
];
