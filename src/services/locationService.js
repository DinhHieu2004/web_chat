export const getLocation = () => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("eerro"));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (p) => {
                resolve({
                    lat: p.coords.latitude,
                    lng: p.coords.longitude,
                });
            },
            (err) => {
                reject(err);
            }
        );
    });

}