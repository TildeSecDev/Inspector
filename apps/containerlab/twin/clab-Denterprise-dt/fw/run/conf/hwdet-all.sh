#!/bin/sh

cd /rtr/run/conf/
echo 1 > /proc/sys/net/ipv6/conf/all/disable_ipv6
echo 1 > /proc/sys/net/ipv6/conf/default/disable_ipv6
echo 0 > /proc/sys/net/ipv6/conf/lo/disable_ipv6
ip link set lo up mtu 65535
ip addr add 127.0.0.1/8 dev lo
ip addr add ::1/128 dev lo
ulimit -c unlimited
#modprobe -r kvm_intel
#modprobe kvm_intel nested=1
#echo 1 > /sys/kernel/mm/ksm/run

### macs ###
echo starting macs.
# eth0 2a:69:57:55:6b:ec #
# ethernet1 aa:c1:ab:56:43:14 #
# ethernet2 aa:c1:ab:0b:1a:0b #

### interfaces ###
echo starting interfaces.
ip link set ethernet1 up multicast on promisc on mtu 1500
ethtool -K ethernet1 rx off
ethtool -K ethernet1 tx off
ethtool -K ethernet1 sg off
ethtool -K ethernet1 tso off
ethtool -K ethernet1 ufo off
ethtool -K ethernet1 gso off
ethtool -K ethernet1 gro off
ethtool -K ethernet1 lro off
ethtool -K ethernet1 rxvlan off
ethtool -K ethernet1 txvlan off
ethtool -K ethernet1 ntuple off
ethtool -K ethernet1 rxhash off
ethtool --set-eee ethernet1 eee off
ip link set ethernet2 up multicast on promisc on mtu 1500
ethtool -K ethernet2 rx off
ethtool -K ethernet2 tx off
ethtool -K ethernet2 sg off
ethtool -K ethernet2 tso off
ethtool -K ethernet2 ufo off
ethtool -K ethernet2 gso off
ethtool -K ethernet2 gro off
ethtool -K ethernet2 lro off
ethtool -K ethernet2 rxvlan off
ethtool -K ethernet2 txvlan off
ethtool -K ethernet2 ntuple off
ethtool -K ethernet2 rxhash off
ethtool --set-eee ethernet2 eee off

### lines ###
echo starting lines.

### main ###
echo starting main.
start-stop-daemon -S -b -x /rtr/run/conf/hwdet-main.sh
exit 0
