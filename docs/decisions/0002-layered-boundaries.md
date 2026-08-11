# ADR 0002: Límites por capas

**Estado:** aceptada.

La UI no accede a persistencia. Features llaman al hook, el hook al servicio y el servicio al repositorio. Esto concentra reglas, facilita pruebas y permite cambiar el almacenamiento sin reescribir pantallas.
